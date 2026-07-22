import type { Route } from "./+types/stock.$code";
import * as React from "react";
import { redirect, useLoaderData, useRevalidator } from "react-router";
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
import { PreservedAsyncSection } from "~/components/ui/preserved-async-section";
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

type StockRouteData = Extract<ReturnType<typeof useLoaderData<typeof loader>>, { status: "ok" }>;

interface StockDetailSnapshot {
  capitalFlow: Awaited<StockRouteData["capitalFlow"]>;
  capitalFlowTrend: Awaited<StockRouteData["capitalFlowTrend"]>;
  code: string;
  companyInfo: Awaited<StockRouteData["companyInfo"]>;
  financials: Awaited<StockRouteData["financials"]>;
  kline: Awaited<StockRouteData["kline"]>;
  minute: Awaited<StockRouteData["minute"]>;
  news: Awaited<StockRouteData["news"]>;
  orderBook: Awaited<StockRouteData["orderBook"]>;
  quote: StockQuote;
}

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

function StockContent({ data }: { data: StockRouteData }) {
  const revalidator = useRevalidator();
  const snapshot = React.useMemo(
    () => resolveStockDetailSnapshot(data),
    [
      data.capitalFlow,
      data.capitalFlowTrend,
      data.code,
      data.companyInfo,
      data.financials,
      data.kline,
      data.minute,
      data.news,
      data.orderBook,
      data.quote,
    ],
  );
  const retry = React.useCallback(() => revalidator.revalidate(), [revalidator]);

  return (
    <PreservedAsyncSection
      resolve={snapshot}
      fallback={<ProgressiveStockContent data={data} />}
      errorElement={<StockDataFailed code={data.code} onRetry={retry} />}
      onRetry={retry}
      showPendingStatus={false}
    >
      {(current) => <StockWorkspace key={current.code} snapshot={current} />}
    </PreservedAsyncSection>
  );
}

function ProgressiveStockContent({ data }: { data: StockRouteData }) {
  return (
    <AsyncSection resolve={data.quote} fallback={<StockPageSkeleton code={data.code} />}>
      {(quote) =>
        quote ? (
          <ProgressiveStockWorkspace data={data} initialQuote={quote as StockQuote} />
        ) : (
          <StockDataFailed code={data.code} />
        )
      }
    </AsyncSection>
  );
}

function ProgressiveStockWorkspace({
  data,
  initialQuote,
}: {
  data: StockRouteData;
  initialQuote: StockQuote;
}) {
  const chartData = React.useMemo(
    () => Promise.all([data.kline, data.minute] as const),
    [data.kline, data.minute],
  );
  const infoData = React.useMemo(
    () => Promise.all([data.companyInfo, data.financials, data.news] as const),
    [data.companyInfo, data.financials, data.news],
  );
  const panelData = React.useMemo(
    () => Promise.all([data.orderBook, data.capitalFlow, data.capitalFlowTrend] as const),
    [data.capitalFlow, data.capitalFlowTrend, data.orderBook],
  );

  return (
    <StockWorkspaceLayout
      code={data.code}
      initialQuote={initialQuote}
      renderChart={(quote) => (
        <AsyncSection resolve={chartData} fallback={<ChartFallback />}>
          {(value) => {
            const [kline, minute] = value as Awaited<typeof chartData>;
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
      )}
      renderInfo={() => (
        <AsyncSection resolve={infoData} fallback={<InfoTabsFallback />}>
          {(value) => {
            const [companyInfo, financials, news] = value as Awaited<typeof infoData>;
            return <StockInfoTabs companyInfo={companyInfo} financials={financials} news={news} />;
          }}
        </AsyncSection>
      )}
      renderPanels={(quote, mobilePanel) => (
        <AsyncSection resolve={panelData} fallback={<PanelFallback />}>
          {(value) => {
            const [orderBook, capitalFlow, capitalFlowTrend] = value as Awaited<typeof panelData>;
            return (
              <StockMarketPanels
                code={data.code}
                initialOrderBook={orderBook}
                initialCapitalFlow={capitalFlow}
                capitalFlowTrend={capitalFlowTrend}
                lastPrice={quote.price}
                mobilePanel={mobilePanel}
              />
            );
          }}
        </AsyncSection>
      )}
    />
  );
}

function StockWorkspace({ snapshot }: { snapshot: StockDetailSnapshot }) {
  return (
    <StockWorkspaceLayout
      code={snapshot.code}
      initialQuote={snapshot.quote}
      renderChart={(quote) => (
        <KLineChart
          dataByPeriod={snapshot.kline}
          defaultPeriod="minute"
          height="clamp(380px, 58vh, 600px)"
          maWindowsByPeriod={STOCK_MA_WINDOWS_BY_PERIOD}
          minuteData={snapshot.minute}
          prevClose={quote.prevClose}
        />
      )}
      renderInfo={() => (
        <StockInfoTabs
          companyInfo={snapshot.companyInfo}
          financials={snapshot.financials}
          news={snapshot.news}
        />
      )}
      renderPanels={(quote, mobilePanel) => (
        <StockMarketPanels
          code={snapshot.code}
          initialOrderBook={snapshot.orderBook}
          initialCapitalFlow={snapshot.capitalFlow}
          capitalFlowTrend={snapshot.capitalFlowTrend}
          lastPrice={quote.price}
          mobilePanel={mobilePanel}
        />
      )}
    />
  );
}

function StockWorkspaceLayout({
  code,
  initialQuote,
  renderChart,
  renderInfo,
  renderPanels,
}: {
  code: string;
  initialQuote: StockQuote;
  renderChart: (quote: StockQuote) => React.ReactNode;
  renderInfo: () => React.ReactNode;
  renderPanels: (quote: StockQuote, mobilePanel: "book" | "flow") => React.ReactNode;
}) {
  const polledQuote = useStockPoll(code, 5_000);
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="contents lg:col-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          <section className="order-1 market-panel overflow-hidden">
            <div className="market-panel-header">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">行情走势</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">分时 / 日周月 K 线</span>
            </div>
            <div className="p-3 sm:p-4">{renderChart(quote)}</div>
          </section>

          <section className="order-3 min-w-0 lg:order-2">{renderInfo()}</section>
        </div>

        <aside className="order-2 space-y-4 lg:col-start-2 lg:order-none lg:row-start-1">
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
          {renderPanels(quote, mobilePanel)}
        </aside>
      </div>
    </div>
  );
}

async function resolveStockDetailSnapshot(data: StockRouteData): Promise<StockDetailSnapshot> {
  const [
    quote,
    kline,
    minute,
    orderBook,
    capitalFlow,
    capitalFlowTrend,
    companyInfo,
    financials,
    news,
  ] = await Promise.all([
    data.quote,
    data.kline,
    data.minute,
    data.orderBook,
    data.capitalFlow,
    data.capitalFlowTrend,
    data.companyInfo,
    data.financials,
    data.news,
  ] as const);

  if (!quote || quote.code !== data.code || quote.price === null) {
    throw new Error(`No usable quote returned for ${data.code}`);
  }

  return {
    capitalFlow,
    capitalFlowTrend,
    code: data.code,
    companyInfo,
    financials,
    kline,
    minute,
    news,
    orderBook,
    quote,
  };
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
    <div className="chart-skeleton chart-skeleton-tall flex items-center justify-center text-xs text-muted-foreground">
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
function StockDataFailed({ code, onRetry }: { code: string; onRetry?: () => void }) {
  return (
    <StatePanel
      icon={<AlertTriangle className="size-5" />}
      title="实时数据暂不可用"
      description={`股票代码 ${code} 的行情源未返回有效数据。`}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry ?? (() => window.location.reload())}
        >
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
