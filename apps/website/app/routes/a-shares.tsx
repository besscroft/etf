import type { Route } from "./+types/a-shares";
import { useLoaderData } from "react-router";
import { Activity, ArrowRight, Search } from "lucide-react";
import { AppHeader } from "~/components/app-header";
import { AppLink as Link } from "~/components/ui/link";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { buildMeta } from "~/lib/seo";
import {
  A_SHARE_HIGHLIGHTS,
  getDomesticQuotes,
  type DomesticQuoteItem,
} from "~/lib/domestic-market";

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "A股行情",
    description: "精选大 A 核心股票行情，覆盖消费、新能源、金融、半导体、资源等代表性资产。",
    path: "/a-shares",
  });
}

export async function loader() {
  return {
    quotes: await getDomesticQuotes(A_SHARE_HIGHLIGHTS),
    fetchedAt: new Date().toISOString(),
  };
}

export default function AShares() {
  const { quotes, fetchedAt } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="A股行情" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 lg:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-lg border bg-card p-5 md:p-7">
            <Badge variant="secondary" className="mb-4 rounded-md">
              大 A 股票观察
            </Badge>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
              用一组高质量标的，快速读懂今天的 A 股风格。
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              精选消费、新能源、金融、半导体和资源品代表股，保留详情页入口，适合盘前盘中快速扫描。
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button asChild className="rounded-md">
                <Link to="/stock/600519">
                  查看股票详情
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md">
                <Link to="/etf">
                  转到场内 ETF
                  <Activity className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Search className="size-4 text-primary" />
              快速入口
            </div>
            <div className="mt-4 grid gap-2">
              {quotes.slice(0, 4).map((quote) => (
                <Link
                  key={quote.code}
                  to={`/stock/${quote.code}`}
                  className="group flex items-center justify-between rounded-md border bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/60 hover:bg-accent/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{quote.displayName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{quote.code}</span>
                  </span>
                  <span className={trendClass(quote.changePercent)}>
                    {formatPercent(quote.changePercent, quote.price)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <MarketSummary quotes={quotes} fetchedAt={fetchedAt} />
        <QuoteGrid quotes={quotes} />
        <QuoteTable quotes={quotes} />
      </main>
    </div>
  );
}

function MarketSummary({ quotes, fetchedAt }: { quotes: DomesticQuoteItem[]; fetchedAt: string }) {
  const liveQuotes = quotes.filter((quote) => quote.price > 0);
  const avgChange =
    liveQuotes.length > 0
      ? liveQuotes.reduce((sum, quote) => sum + quote.changePercent, 0) / liveQuotes.length
      : 0;
  const time = new Date(fetchedAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <StatCard label="覆盖标的" value={`${quotes.length} 只`} />
      <StatCard label="实时可用" value={`${liveQuotes.length} 只`} />
      <StatCard
        label="样本均涨跌"
        value={formatPercent(avgChange, liveQuotes.length)}
        tone={avgChange}
      />
      <p className="sm:col-span-3 text-xs text-muted-foreground">
        更新时间 {time}，数据来源东方财富，内容仅供参考。
      </p>
    </section>
  );
}

function StatCard({ label, value, tone = 0 }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tone === 0 ? "" : trendClass(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function QuoteGrid({ quotes }: { quotes: DomesticQuoteItem[] }) {
  return (
    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {quotes.map((quote) => (
        <Link key={quote.code} to={`/stock/${quote.code}`} className="group">
          <Card className="h-full rounded-lg shadow-none transition-colors group-hover:border-primary/70">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="secondary" className="mb-2 rounded-md text-[10px]">
                    {quote.theme}
                  </Badge>
                  <h2 className="truncate text-base font-semibold">{quote.displayName}</h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    {quote.marketLabel} {quote.code}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-semibold ${trendClass(quote.changePercent)}`}
                >
                  {formatPercent(quote.changePercent, quote.price)}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
                <Metric label="最新" value={formatPrice(quote.price)} />
                <Metric label="今开" value={formatPrice(quote.open)} />
                <Metric label="成交额" value={formatTurnover(quote.turnover)} />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </section>
  );
}

function QuoteTable({ quotes }: { quotes: DomesticQuoteItem[] }) {
  return (
    <section className="mt-8 hidden overflow-hidden rounded-lg border bg-card md:block">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">标的</th>
            <th className="px-4 py-3 text-right font-medium">最新价</th>
            <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
            <th className="px-4 py-3 text-right font-medium">今开</th>
            <th className="px-4 py-3 text-right font-medium">成交额</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.code} className="border-t transition-colors hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link to={`/stock/${quote.code}`} className="hover:text-primary">
                  <span className="font-medium">{quote.displayName}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{quote.code}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-mono">{formatPrice(quote.price)}</td>
              <td className={`px-4 py-3 text-right font-mono ${trendClass(quote.changePercent)}`}>
                {formatPercent(quote.changePercent, quote.price)}
              </td>
              <td className="px-4 py-3 text-right font-mono">{formatPrice(quote.open)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatTurnover(quote.turnover)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono font-medium">{value}</p>
    </div>
  );
}

function formatPrice(value: number) {
  return value > 0 ? value.toFixed(2) : "待更新";
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
