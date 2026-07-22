import type { Route } from "./+types/stock.$code";
import * as React from "react";
import { redirect, useLoaderData } from "react-router";
import { AlertTriangle, ArrowLeft, BarChart3, LineChart } from "lucide-react";

import { AShareShell } from "~/components/stock/a-share-shell";
import { CapitalFlowPanel } from "~/components/stock/capital-flow-panel";
import { KLineChart } from "~/components/stock/kline-chart";
import { OrderBook } from "~/components/stock/order-book";
import { StockInfoTabs } from "~/components/stock/stock-info-tabs";
import { StockPageSkeleton } from "~/components/stock/stock-page-skeleton";
import { StockQuoteCard } from "~/components/stock/stock-quote-card";
import { useStockDetailPoll } from "~/components/stock/use-stock-detail-poll";
import { useStockPoll } from "~/components/stock/use-stock-poll";
import { WatchlistButton } from "~/components/stock/watchlist-button";
import { AsyncSection } from "~/components/ui/async-section";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { AppLink as Link } from "~/components/ui/link";
import { buildMeta, buildStockJsonLd } from "~/lib/seo";
import { useIsMobile } from "~/hooks/use-media-query";
import {
  getStockCapitalFlow,
  getStockCapitalFlowTrend,
  getStockCompanyInfo,
  getStockFinancials,
  getStockKLineMap,
  getStockMinuteTrend,
  getStockNews,
  getStockOrderBook,
  getStockQuote,
  isExchangeETFCode,
  type StockCapitalFlow,
  type StockKLineMap,
  type StockOrderBook,
  type StockQuote,
} from "~/lib/stock-data";

const EMPTY_KLINE_MAP: StockKLineMap = { "1d": [], "1w": [], "1m": [] };
const STOCK_MA_WINDOWS_BY_PERIOD = { "1d": [5, 10, 20, 60, 120, 250] };

export function meta({ data, params }: Route.MetaArgs) {
  const code = params.code;
  if (data?.status === "unsupported")
    return buildMeta({
      title: `${code} - 暂不支持`,
      description: `股票代码 ${code} 不在 A 股范围内。`,
      path: `/stock/${code}`,
      noindex: true,
    });
  return buildMeta({
    title: `${code} 股票详情 - 实时行情/K 线`,
    description: `查看 ${code} 的实时行情、分时、日周月 K 线、盘口、资金流和公司资料。`,
    path: `/stock/${code}`,
    type: "article",
    extra: [buildStockJsonLd({ code, name: code, path: `/stock/${code}` })],
  });
}

export async function loader({ params }: Route.LoaderArgs) {
  const code = params.code;
  if (/^\d{6}$/.test(code) && isExchangeETFCode(code)) throw redirect(`/etf/${code}`);
  if (!/^\d{5,6}$/.test(code)) return unsupportedData(code);
  if (code.length === 5) return { ...unsupportedData(code), status: "hk" as const };
  return {
    code,
    status: "ok" as const,
    name: null,
    quote: getStockQuote(code),
    kline: getStockKLineMap(code),
    minute: getStockMinuteTrend(code),
    orderBook: getStockOrderBook(code),
    capitalFlow: getStockCapitalFlow(code),
    capitalFlowTrend: getStockCapitalFlowTrend(code, 30),
    companyInfo: getStockCompanyInfo(code),
    financials: getStockFinancials(code),
    news: getStockNews(code, 10),
  };
}

function unsupportedData(code: string) {
  return {
    code,
    status: "unsupported" as const,
    name: null,
    quote: Promise.resolve(null),
    kline: Promise.resolve(EMPTY_KLINE_MAP),
    minute: Promise.resolve([]),
    companyInfo: Promise.resolve(null),
    financials: Promise.resolve(null),
    news: Promise.resolve([]),
  };
}

export default function StockDetail() {
  const data = useLoaderData<typeof loader>();
  return (
    <AShareShell currentLabel={data.status === "ok" ? "个股详情" : "股票详情"}>
      {data.status === "unsupported" ? <StockUnsupported code={data.code} /> : null}
      {data.status === "hk" ? <HKStockPending code={data.code} /> : null}
      {data.status === "ok" ? <StockContent data={data} /> : null}
    </AShareShell>
  );
}

function StockContent({
  data,
}: {
  data: Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: "ok" }>;
}) {
  return (
    <AsyncSection resolve={data.quote} fallback={<StockPageSkeleton code={data.code} />}>
      {(quote) =>
        quote ? (
          <StockWorkspace data={data} initialQuote={quote as StockQuote} />
        ) : (
          <StockDataFailed code={data.code} />
        )
      }
    </AsyncSection>
  );
}

function StockWorkspace({
  data,
  initialQuote,
}: {
  data: Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: "ok" }>;
  initialQuote: StockQuote;
}) {
  const polledQuote = useStockPoll(data.code, 5_000);
  const quote = polledQuote?.price !== null && polledQuote ? polledQuote : initialQuote;
  const [mobilePanel, setMobilePanel] = React.useState<"book" | "flow">("book");

  React.useEffect(() => {
    if (quote.name && quote.name !== quote.code)
      document.title = `${quote.name}（${quote.code}）股票详情 - 实时行情/K 线`;
  }, [quote.code, quote.name]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/a-shares" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="size-3.5" /> A 股行情
          </Link>
          <span>/</span>
          <span>{quote.name || quote.code}</span>
        </div>
        <WatchlistButton code={quote.code} name={quote.name} variant="icon" />
      </div>

      <StockQuoteCard quote={quote} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="market-panel overflow-hidden">
          <div className="market-panel-header">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">行情走势</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">分时 / 日周月 K 线</span>
          </div>
          <div className="p-3 sm:p-4">
            <AsyncSection
              resolve={Promise.all([data.kline, data.minute])}
              fallback={<ChartFallback />}
            >
              {(value) => {
                const [kline, minute] = value as [StockKLineMap, Awaited<typeof data.minute>];
                return (
                  <KLineChart
                    dataByPeriod={kline}
                    defaultPeriod="minute"
                    height="clamp(380px, 58vh, 600px)"
                    maWindowsByPeriod={STOCK_MA_WINDOWS_BY_PERIOD}
                    minuteData={minute}
                    prevClose={quote.prevClose}
                  />
                );
              }}
            </AsyncSection>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="market-segment w-full lg:hidden">
            <button
              type="button"
              onClick={() => setMobilePanel("book")}
              className={cnTab(mobilePanel === "book")}
            >
              五档盘口
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("flow")}
              className={cnTab(mobilePanel === "flow")}
            >
              资金流向
            </button>
          </div>
          <AsyncSection
            resolve={Promise.all([data.orderBook, data.capitalFlow, data.capitalFlowTrend])}
            fallback={<PanelFallback />}
          >
            {(value) => {
              const [book, flow, trend] = value as [
                StockOrderBook | null,
                StockCapitalFlow | null,
                Awaited<typeof data.capitalFlowTrend>,
              ];
              return (
                <StockMarketPanels
                  code={data.code}
                  initialOrderBook={book}
                  initialCapitalFlow={flow}
                  capitalFlowTrend={trend}
                  lastPrice={quote.price}
                  mobilePanel={mobilePanel}
                />
              );
            }}
          </AsyncSection>
        </aside>
      </div>

      <AsyncSection
        resolve={Promise.all([data.companyInfo, data.financials, data.news])}
        fallback={<InfoTabsFallback />}
      >
        {(value) => {
          const [info, financials, news] = value as [
            Awaited<typeof data.companyInfo>,
            Awaited<typeof data.financials>,
            Awaited<typeof data.news>,
          ];
          return <StockInfoTabs companyInfo={info} financials={financials} news={news} />;
        }}
      </AsyncSection>
    </div>
  );
}

function StockMarketPanels({
  code,
  initialOrderBook,
  initialCapitalFlow,
  capitalFlowTrend,
  lastPrice,
  mobilePanel,
}: {
  code: string;
  initialOrderBook: StockOrderBook | null;
  initialCapitalFlow: StockCapitalFlow | null;
  capitalFlowTrend: Awaited<ReturnType<typeof getStockCapitalFlowTrend>>;
  lastPrice: number | null;
  mobilePanel: "book" | "flow";
}) {
  const isMobile = useIsMobile();
  const { orderBook, capitalFlow } = useStockDetailPoll(code, 15_000, {
    orderBook: initialOrderBook,
    capitalFlow: initialCapitalFlow,
    minute: null,
  });
  if (isMobile)
    return mobilePanel === "book" ? (
      <OrderBook book={orderBook} lastPrice={lastPrice} />
    ) : (
      <CapitalFlowPanel flow={capitalFlow} trend={capitalFlowTrend} trendDays={30} />
    );
  return (
    <div className="space-y-4">
      <OrderBook book={orderBook} lastPrice={lastPrice} />
      <CapitalFlowPanel flow={capitalFlow} trend={capitalFlowTrend} trendDays={30} />
    </div>
  );
}

function cnTab(active: boolean) {
  return `flex-1 px-3 py-1.5 text-xs ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`;
}

function ChartFallback() {
  return (
    <div className="flex h-[420px] items-center justify-center text-xs text-muted-foreground">
      行情图加载中
    </div>
  );
}
function PanelFallback() {
  return (
    <div className="market-panel flex h-56 items-center justify-center text-xs text-muted-foreground">
      盘口与资金加载中
    </div>
  );
}
function InfoTabsFallback() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-xs text-muted-foreground">
        公司资料加载中
      </CardContent>
    </Card>
  );
}

function StockUnsupported({ code }: { code: string }) {
  return (
    <StatePanel
      icon={<AlertTriangle className="size-5" />}
      title="股票代码不支持"
      description={`股票代码 ${code || "未知"} 不是可用的 A 股代码。`}
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/a-shares">返回 A 股行情</Link>
        </Button>
      }
    />
  );
}
function HKStockPending({ code }: { code: string }) {
  return (
    <StatePanel
      icon={<LineChart className="size-5" />}
      title="港股详情建设中"
      description={`股票代码 ${code} 属于港股，当前工作台只接入 A 股。`}
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/a-shares">返回 A 股行情</Link>
        </Button>
      }
    />
  );
}
function StockDataFailed({ code }: { code: string }) {
  return (
    <StatePanel
      icon={<AlertTriangle className="size-5" />}
      title="实时数据暂不可用"
      description={`股票代码 ${code} 的行情源未返回有效数据。`}
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
          重新加载
        </Button>
      }
    />
  );
}
function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <section className="market-panel flex min-h-64 flex-col items-center justify-center text-center">
      <span className="text-muted-foreground">{icon}</span>
      <h1 className="mt-3 text-lg font-semibold">{title}</h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{action}</div>
    </section>
  );
}
