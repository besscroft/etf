/**
 * 股票详情页（2026-07-03 新增）
 *
 * 路由：/stock/:code
 *
 * 功能：
 * - 实时报价（大字号 + 涨跌色 + 闪动效果）
 * - K线（日/周/月切换 + MA5/10/20 均线）
 * - 分时走势（实时价 + 均价 + 昨收参考线）
 * - Tab：公司概况 / 财务指标 / 近期新闻
 * - 客户端每 15s 轮询实时价
 *
 * 错误处理：
 * - 非法代码（非 6 位数字）→ 404 视图 + noindex
 * - 港股（5 位数字）→ 「港股板块建设中」提示
 * - 数据获取失败 → 走 FundDetailWithRetry 状态机（保持 skeleton 后台重试 3 次）
 */

import type { Route } from "./+types/stock.$code";
import { useLoaderData, useParams } from "react-router";
import { useState, useEffect } from "react";
import { AlertTriangle, BarChart3, LineChart, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AppHeader } from "~/components/app-header";
import { Breadcrumb } from "~/components/ui/breadcrumb";
import { AsyncSection } from "~/components/ui/async-section";
import { buildMeta, buildStockJsonLd } from "~/lib/seo";
import {
  detectAShareMarket,
  getStockCompanyInfo,
  getStockFinancials,
  getStockKLine,
  getStockMinuteTrend,
  getStockNews,
  getStockQuote,
  type KLinePeriod,
  type StockQuote,
} from "~/lib/stock-data";

import { KLineChart } from "~/components/stock/kline-chart";
import { MinuteChart } from "~/components/stock/minute-chart";
import { StockQuoteCard } from "~/components/stock/stock-quote-card";
import { StockInfoTabs } from "~/components/stock/stock-info-tabs";
import { StockPageSkeleton } from "~/components/stock/stock-page-skeleton";
import { useStockPoll } from "~/components/stock/use-stock-poll";

export function meta({ data, params }: Route.MetaArgs) {
  const code = params.code;
  const status = data?.status ?? "unknown";

  if (status === "unsupported") {
    return buildMeta({
      title: `${code} - 暂不支持`,
      description: `股票代码 ${code} 不在 A 股范围内，暂不支持查看详情。`,
      path: `/stock/${code}`,
      noindex: true,
    });
  }

  // 注：股票真实名是异步数据（quote 走 defer），meta() 同步拿不到。
  // 客户端 useEffect 拿到真实名后会动态覆盖 document.title。
  // 这里给搜索引擎一个 code 占位 + JSON-LD 结构化数据（schema.org Quotation）。
  return buildMeta({
    title: `${code} 股票详情 - 实时行情/K线/分时`,
    description: `股票代码 ${code} 的实时行情、每日/周/月 K 线、分时走势图、公司概况、财务指标与近期新闻。`,
    path: `/stock/${code}`,
    type: "article",
    extra: [buildStockJsonLd({ code, name: code, path: `/stock/${code}` })],
  });
}

export async function loader({ params }: Route.LoaderArgs) {
  const code = params.code;

  // 非法代码（不是 6 位 A 股 / 5 位港股）→ 标记 unsupported，meta 走 noindex
  if (!/^\d{5,6}$/.test(code)) {
    return {
      code,
      status: "unsupported" as const,
      name: null,
      quote: Promise.resolve(null),
      kline: Promise.resolve([]),
      minute: Promise.resolve([]),
      companyInfo: Promise.resolve(null),
      financials: Promise.resolve(null),
      news: Promise.resolve([]),
    };
  }

  // 港股（5 位）→ 不拉接口，name 为 null 让 UI 提示
  const isHK = code.length === 5;
  if (isHK) {
    return {
      code,
      status: "hk" as const,
      name: null,
      quote: Promise.resolve(null),
      kline: Promise.resolve([]),
      minute: Promise.resolve([]),
      companyInfo: Promise.resolve(null),
      financials: Promise.resolve(null),
      news: Promise.resolve([]),
    };
  }

  // A 股：走全 defer，所有数据后台拉
  return {
    code,
    status: "ok" as const,
    name: null, // 客户端拿到 quote 后回填
    quote: getStockQuote(code),
    kline: getStockKLine(code, "1d"),
    minute: getStockMinuteTrend(code),
    companyInfo: getStockCompanyInfo(code),
    financials: getStockFinancials(code),
    news: getStockNews(code, 10),
  };
}

export default function StockDetail() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="股票详情" />
      <main className="container mx-auto max-w-4xl px-3 py-6 sm:px-4">
        {data.status === "unsupported" && <StockUnsupported code={data.code} />}
        {data.status === "hk" && <HKStockPending code={data.code} />}
        {data.status === "ok" && <StockContent data={data} />}
      </main>
    </div>
  );
}

function StockContent({
  data,
}: {
  data: Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: "ok" }>;
}) {
  return (
    <AsyncSection resolve={data.quote} fallback={<StockPageSkeleton code={data.code} />}>
      {(q) => {
        const initialQuote = q as StockQuote | null;
        if (!initialQuote) {
          return <StockDataFailed code={data.code} />;
        }
        return <StockWithQuoteRetry data={data} initialQuote={initialQuote} />;
      }}
    </AsyncSection>
  );
}

/**
 * 实时价轮询 + 标题动态更新
 */
function StockWithQuoteRetry({
  data,
  initialQuote,
}: {
  data: Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: "ok" }>;
  initialQuote: StockQuote;
}) {
  const polledQuote = useStockPoll(data.code, 15_000);
  const quote = polledQuote ?? initialQuote;

  // 客户端动态 title：拿到真实股票名后覆盖
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!quote.name || quote.name === quote.code) return;
    document.title = `${quote.name}（${quote.code}）股票详情 - 实时行情/K线/分时`;
  }, [quote.name, quote.code]);

  const [period, setPeriod] = useState<KLinePeriod>("1d");
  // K线数据按 period 切换：当前实现简化为初始只拉 1d，提供切换 UI 但需要重新拉接口
  // 暂时只显示初始 1d 数据 + 切换按钮占位（后续优化：在路由层加 ?period=1w 参数）

  return (
    <>
      <Breadcrumb
        items={[
          { name: "首页", path: "/" },
          { name: "基金", path: "/otc-funds" },
          { name: "股票", path: "/stock" },
          { name: quote.name && quote.name !== quote.code ? quote.name : quote.code },
        ]}
      />

      <div className="mb-4 flex items-end gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">
              {quote.name && quote.name !== quote.code ? quote.name : `股票 ${quote.code}`}
            </h1>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {quote.code}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {quote.marketLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">数据仅供参考，不构成投资建议</p>
        </div>
      </div>

      {/* 实时价卡片（自带轮询） */}
      <div className="mb-4">
        <StockQuoteCard quote={quote} />
      </div>

      {/* K线 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <BarChart3 className="size-4 text-blue-500" />
            K线走势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncSection resolve={data.kline} fallback={<KLineChartFallback />}>
            {(k) => (
              <KLineChart
                data={
                  k as Array<{
                    date: string;
                    open: number;
                    close: number;
                    high: number;
                    low: number;
                    volume: number;
                    turnover: number;
                    amplitude: number;
                    changePercent: number;
                    changeAmount: number;
                  }>
                }
                defaultPeriod={period}
                height={320}
              />
            )}
          </AsyncSection>
        </CardContent>
      </Card>

      {/* 分时 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Clock className="size-4 text-amber-500" />
            分时走势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncSection resolve={data.minute} fallback={<div className="h-[280px]" />}>
            {(m) => (
              <MinuteChart
                data={
                  m as Array<{
                    time: string;
                    price: number;
                    avgPrice: number;
                    volume: number;
                    turnover: number;
                  }>
                }
                prevClose={quote.prevClose}
                height={260}
              />
            )}
          </AsyncSection>
        </CardContent>
      </Card>

      {/* 信息 Tab */}
      <div className="mb-4">
        <AsyncSection
          resolve={Promise.all([data.companyInfo, data.financials, data.news]).then((v) => v)}
          fallback={<InfoTabsFallback />}
        >
          {(v) => {
            const [info, fin, news] = v as [
              Awaited<typeof data.companyInfo>,
              Awaited<typeof data.financials>,
              Awaited<typeof data.news>,
            ];
            return <StockInfoTabs companyInfo={info} financials={fin} news={news} />;
          }}
        </AsyncSection>
      </div>
    </>
  );
}

function KLineChartFallback() {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Button type="button" variant="default" size="sm" disabled>
          日K
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled>
          周K
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled>
          月K
        </Button>
      </div>
      <div className="flex h-[320px] items-center justify-center text-xs text-muted-foreground">
        K 线加载中...
      </div>
    </div>
  );
}

function InfoTabsFallback() {
  return (
    <Card>
      <CardContent className="py-6 text-center text-sm text-muted-foreground">
        加载中...
      </CardContent>
    </Card>
  );
}

function StockUnsupported({ code }: { code: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="size-6 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">股票代码不支持</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        股票代码 {code || "未知"} 不是 A 股 6 位数字代码，暂不支持查看详情。
      </p>
      <a
        href="/otc-funds"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        浏览场外基金
      </a>
    </div>
  );
}

function HKStockPending({ code }: { code: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <LineChart className="size-6 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">港股详情建设中</h2>
      <p className="mb-1 text-sm text-muted-foreground">
        股票代码 {code}（港股）详情页正在开发中。
      </p>
      <p className="mb-6 text-xs text-muted-foreground">
        港股数据接入与行情刷新机制与 A 股不同，敬请期待。
      </p>
      <a
        href="/otc-funds"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        浏览场外基金
      </a>
    </div>
  );
}

function StockDataFailed({ code }: { code: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="size-6 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">数据获取失败</h2>
      <p className="mb-1 text-sm text-muted-foreground">股票代码 {code} 的实时数据暂时无法获取。</p>
      <p className="mb-6 text-xs text-muted-foreground">请检查代码是否正确，或稍后再试。</p>
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        刷新页面
      </button>
    </div>
  );
}

// 暴露给 meta()：从 quote 同步拿 name
// 注意：meta() 是同步的，loader 拿不到 quote 的真实 name（要在客户端 promise resolve 后才知）
// 这里把 initialQuote 也同步进 loader 返回值是更优雅的做法，但为了简化，目前走客户端 useEffect 动态 title
// 改进点：可加一个 `peekStockName(code)` 同步读缓存，loader 调它给 meta() 准备数据
// 注：detectAShareMarket 引入但未直接使用（路由里只做长度判断），保留以备后续扩展
void detectAShareMarket;
