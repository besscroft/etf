import type { Route } from "./+types/etf.$code";
import { redirect, useLoaderData } from "react-router";
import { useEffect } from "react";
import { AlertTriangle, BarChart3, Layers } from "lucide-react";

import { AppHeader } from "~/components/app-header";
import { AsyncSection } from "~/components/ui/async-section";
import { Breadcrumb } from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { KLineChart } from "~/components/stock/kline-chart";
import { StockQuoteCard } from "~/components/stock/stock-quote-card";
import { useStockPoll } from "~/components/stock/use-stock-poll";
import { buildMeta, buildStockJsonLd } from "~/lib/seo";
import {
  getStockKLineMap,
  getStockMinuteTrend,
  getStockQuote,
  isExchangeETFCode,
  type MinutePoint,
  type StockKLineMap,
  type StockQuote,
} from "~/lib/stock-data";

const EMPTY_KLINE_MAP: StockKLineMap = { "1d": [], "1w": [], "1m": [] };

export function meta({ data, params }: Route.MetaArgs) {
  const code = params.code;
  const status = data?.status ?? "unknown";

  if (status === "unsupported") {
    return buildMeta({
      title: `${code} - ETF 代码不支持`,
      description: `代码 ${code} 不在场内 ETF 支持范围内。`,
      path: `/etf/${code}`,
      noindex: true,
    });
  }

  return buildMeta({
    title: `${code} 场内ETF详情 - 实时行情/K线`,
    description: `场内 ETF ${code} 的实时行情、分时、日 K、周 K、月 K 和成交数据。`,
    path: `/etf/${code}`,
    type: "article",
    extra: [buildStockJsonLd({ code, name: code, path: `/etf/${code}` })],
  });
}

export async function loader({ params }: Route.LoaderArgs) {
  const code = params.code;

  if (!/^\d{6}$/.test(code)) {
    return {
      code,
      status: "unsupported" as const,
      quote: Promise.resolve(null),
      kline: Promise.resolve(EMPTY_KLINE_MAP),
      minute: Promise.resolve([]),
    };
  }

  if (!isExchangeETFCode(code)) {
    throw redirect(`/stock/${code}`);
  }

  return {
    code,
    status: "ok" as const,
    quote: getStockQuote(code),
    kline: getStockKLineMap(code),
    minute: getStockMinuteTrend(code),
  };
}

export default function ETFDetail() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="场内ETF详情" />
      <main className="container mx-auto max-w-4xl px-3 py-6 sm:px-4">
        {data.status === "unsupported" ? (
          <ETFUnsupported code={data.code} />
        ) : (
          <ETFContent data={data} />
        )}
      </main>
    </div>
  );
}

function ETFContent({
  data,
}: {
  data: Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: "ok" }>;
}) {
  return (
    <AsyncSection resolve={data.quote} fallback={<ETFPageSkeleton />}>
      {(q) => {
        const initialQuote = q as StockQuote | null;
        if (!initialQuote) return <ETFDataFailed code={data.code} />;
        return <ETFWithQuote data={data} initialQuote={initialQuote} />;
      }}
    </AsyncSection>
  );
}

function ETFWithQuote({
  data,
  initialQuote,
}: {
  data: Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: "ok" }>;
  initialQuote: StockQuote;
}) {
  const polledQuote = useStockPoll(data.code, 15_000);
  const quote = polledQuote ?? initialQuote;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!quote.name || quote.name === quote.code) return;
    document.title = `${quote.name}（${quote.code}）场内ETF详情 - 实时行情/K线`;
  }, [quote.name, quote.code]);

  return (
    <>
      <Breadcrumb
        items={[
          { name: "首页", path: "/" },
          { name: "场内ETF", path: "/etf" },
          { name: quote.name && quote.name !== quote.code ? quote.name : quote.code },
        ]}
      />

      <div className="mb-4 flex items-end gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">
              {quote.name && quote.name !== quote.code ? quote.name : `ETF ${quote.code}`}
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

      <div className="mb-4">
        <StockQuoteCard quote={quote} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <BarChart3 className="size-4 text-blue-500" />
            行情走势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncSection
            resolve={Promise.all([data.kline, data.minute]).then((v) => v)}
            fallback={<ChartFallback />}
          >
            {(v) => {
              const [kline, minute] = v as [StockKLineMap, MinutePoint[]];
              return (
                <KLineChart
                  dataByPeriod={kline}
                  defaultPeriod="minute"
                  minuteData={minute}
                  prevClose={quote.prevClose}
                />
              );
            }}
          </AsyncSection>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        场内 ETF 行情使用交易所实时行情口径；净值、申赎等基金资料请以基金公司公告为准。
      </p>
    </>
  );
}

function ETFPageSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>首页</span>
        <span>/</span>
        <span>场内ETF</span>
        <span>/</span>
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="mb-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-1 h-3 w-24" />
      </div>
      <Card className="mb-4">
        <CardContent className="py-5">
          <Skeleton className="mb-4 h-12 w-44" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-14" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="chart-skeleton chart-skeleton-tall w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ChartFallback() {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {["分时", "日K", "周K", "月K"].map((label, index) => (
          <Button
            key={label}
            type="button"
            variant={index === 0 ? "default" : "secondary"}
            size="sm"
            disabled
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="chart-skeleton chart-skeleton-tall flex items-center justify-center text-xs text-muted-foreground">
        行情图加载中...
      </div>
    </div>
  );
}

function ETFUnsupported({ code }: { code: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Layers className="size-6 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">ETF 代码不支持</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        代码 {code || "未知"} 不是当前支持的 6 位场内 ETF 代码。
      </p>
      <a
        href="/etf"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        返回场内 ETF
      </a>
    </div>
  );
}

function ETFDataFailed({ code }: { code: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="size-6 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">数据获取失败</h2>
      <p className="mb-6 text-sm text-muted-foreground">ETF 代码 {code} 的实时行情暂时无法获取。</p>
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
