import type { Route } from "./+types/etf";
import { useLoaderData } from "react-router";
import { ArrowRight, Layers, LineChart } from "lucide-react";
import { AppHeader } from "~/components/app-header";
import { AppLink as Link } from "~/components/ui/link";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { buildMeta } from "~/lib/seo";
import { ETF_HIGHLIGHTS, getDomesticQuotes, type DomesticQuoteItem } from "~/lib/domestic-market";

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "场内ETF",
    description: "精选沪深300、上证50、中证500、科创50、创业板、红利和行业主题场内 ETF 行情。",
    path: "/etf",
  });
}

export async function loader() {
  return {
    quotes: await getDomesticQuotes(ETF_HIGHLIGHTS),
    fetchedAt: new Date().toISOString(),
  };
}

export default function ETFPage() {
  const { quotes, fetchedAt } = useLoaderData<typeof loader>();
  const broad = quotes.filter((quote) =>
    ["510300", "510050", "510500", "512100", "159915", "588000"].includes(quote.code),
  );
  const sectors = quotes.filter((quote) => !broad.some((item) => item.code === quote.code));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="场内ETF" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 lg:py-12">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-5 md:p-8">
              <Badge variant="secondary" className="mb-4 rounded-md">
                场内 ETF 观察
              </Badge>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
                宽基打底，主题做卫星，ETF 先看这几组。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                用精选场内 ETF 观察 A 股风格轮动，详情页沿用股票行情能力，适合快速追踪价格和成交。
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild className="rounded-md">
                  <Link to="/etf/510300">
                    沪深300ETF
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-md">
                  <Link to="/otc-funds">
                    查看场外基金
                    <LineChart className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="border-t bg-muted/30 p-4 lg:border-l lg:border-t-0">
              <div className="grid gap-2 sm:grid-cols-2">
                {quotes.slice(0, 6).map((quote) => (
                  <MiniETFCard key={quote.code} quote={quote} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <ETFSection
          title="核心宽基"
          description="用于观察市场底层风险偏好和主要指数风格。"
          quotes={broad}
        />
        <ETFSection
          title="行业与主题"
          description="用于观察结构性机会，不作为单一买卖依据。"
          quotes={sectors}
        />
        <QuoteTable quotes={quotes} fetchedAt={fetchedAt} />
      </main>
    </div>
  );
}

function ETFSection({
  title,
  description,
  quotes,
}: {
  title: string;
  description: string;
  quotes: DomesticQuoteItem[];
}) {
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quotes.map((quote) => (
          <Link key={quote.code} to={`/etf/${quote.code}`} className="group">
            <Card className="h-full rounded-lg shadow-none transition-colors group-hover:border-primary/70">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="mb-2 rounded-md text-[10px]">
                      {quote.theme}
                    </Badge>
                    <h3 className="truncate text-base font-semibold">{quote.displayName}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{quote.code}</p>
                  </div>
                  <Layers className="size-4 shrink-0 text-primary" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Metric label="最新" value={formatPrice(quote.price)} />
                  <Metric
                    label="涨跌"
                    value={formatPercent(quote.changePercent, quote.price)}
                    tone={quote.changePercent}
                  />
                  <Metric label="成交额" value={formatTurnover(quote.turnover)} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MiniETFCard({ quote }: { quote: DomesticQuoteItem }) {
  return (
    <Link
      to={`/etf/${quote.code}`}
      className="rounded-md border bg-card px-3 py-3 transition-colors hover:border-primary/70"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{quote.displayName}</span>
          <span className="font-mono text-xs text-muted-foreground">{quote.code}</span>
        </span>
        <span className={`font-mono text-sm font-semibold ${trendClass(quote.changePercent)}`}>
          {formatPercent(quote.changePercent, quote.price)}
        </span>
      </div>
    </Link>
  );
}

function QuoteTable({ quotes, fetchedAt }: { quotes: DomesticQuoteItem[]; fetchedAt: string }) {
  const time = new Date(fetchedAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="mt-8 overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-1 border-b px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">ETF 行情明细</h2>
          <p className="text-xs text-muted-foreground">更新时间 {time}，数据来源东方财富。</p>
        </div>
        <Link to="/a-shares" className="text-sm text-primary hover:underline">
          查看 A 股行情
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">ETF</th>
              <th className="px-4 py-3 text-right font-medium">最新价</th>
              <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
              <th className="px-4 py-3 text-right font-medium">最高</th>
              <th className="px-4 py-3 text-right font-medium">最低</th>
              <th className="px-4 py-3 text-right font-medium">成交额</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.code} className="border-t transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link to={`/etf/${quote.code}`} className="hover:text-primary">
                    <span className="font-medium">{quote.displayName}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {quote.code}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(quote.price)}</td>
                <td className={`px-4 py-3 text-right font-mono ${trendClass(quote.changePercent)}`}>
                  {formatPercent(quote.changePercent, quote.price)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(quote.high)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(quote.low)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatTurnover(quote.turnover)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value, tone = 0 }: { label: string; value: string; tone?: number }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 truncate font-mono text-sm font-medium ${tone === 0 ? "" : trendClass(tone)}`}
      >
        {value}
      </p>
    </div>
  );
}

function formatPrice(value: number) {
  return value > 0 ? value.toFixed(3) : "待更新";
}

function formatPercent(value: number, hasData: number | boolean) {
  if (!hasData) return "待更新";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatTurnover(value: number) {
  if (value <= 0) return "待更新";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}亿`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(2)}万`;
  return value.toFixed(0);
}

function trendClass(value: number) {
  if (value > 0) return "text-[color:var(--market-up)]";
  if (value < 0) return "text-[color:var(--market-down)]";
  return "text-muted-foreground";
}
