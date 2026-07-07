import type { Route } from "./+types/a-shares";
import * as React from "react";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { useLoaderData } from "react-router";

import { AppHeader } from "~/components/app-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AppLink as Link } from "~/components/ui/link";
import { buildMeta } from "~/lib/seo";
import {
  getAshareMarketSnapshot,
  type AShareSearchResponse,
  type StockSearchItem,
} from "~/lib/stock-data";

const SEARCH_LIMIT = 50;

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "A股行情",
    description: "搜索沪深京 A 股股票，查看实时行情、涨跌幅、成交额与股票详情。",
    path: "/a-shares",
  });
}

export async function loader() {
  const results = await getAshareMarketSnapshot(SEARCH_LIMIT);
  return {
    initialSearch: {
      query: "",
      results,
      fetchedAt: new Date().toISOString(),
    } satisfies AShareSearchResponse,
  };
}

export default function AShares() {
  const { initialSearch } = useLoaderData<typeof loader>();
  const [query, setQuery] = React.useState("");
  const [payload, setPayload] = React.useState<AShareSearchResponse>(initialSearch);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPayload(initialSearch);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams({ q: trimmed, limit: String(SEARCH_LIMIT) });
        const res = await fetch(`/api/a-share-search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`search failed: ${res.status}`);
        const data = (await res.json()) as AShareSearchResponse;
        setPayload(data);
        setStatus("idle");
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setPayload({
          query: trimmed,
          results: [],
          fetchedAt: new Date().toISOString(),
          message: "A 股搜索暂时不可用，请稍后再试。",
        });
        setStatus("error");
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [initialSearch, query]);

  const trimmedQuery = query.trim();
  const results = payload.results;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="A股行情" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 lg:py-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">沪深京 A 股</Badge>
                <span className="text-xs text-muted-foreground">
                  {trimmedQuery ? `搜索：${trimmedQuery}` : "涨幅快照"}
                </span>
              </div>
              <CardTitle className="text-xl md:text-2xl">A股全市场搜索</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索代码、名称或拼音缩写"
                  className="h-11 w-full rounded-none border bg-background pl-10 pr-20 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {status === "loading" && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                  {query && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="清空搜索"
                      onClick={() => setQuery("")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>覆盖沪 A、深 A、科创板、京 A</span>
                <span className="text-border">|</span>
                <span>{formatFetchedAt(payload.fetchedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <MarketSummary results={results} fetchedAt={payload.fetchedAt} />
        </section>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">{trimmedQuery ? "搜索结果" : "涨幅快照"}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {results.length > 0 ? `显示 ${results.length} 只股票` : "暂无匹配结果"}
              </p>
            </div>
            {payload.message && (
              <p
                className={
                  status === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"
                }
              >
                {payload.message}
              </p>
            )}
          </div>

          {results.length > 0 ? (
            <SearchResults results={results} />
          ) : (
            <EmptyState query={trimmedQuery} />
          )}
        </section>
      </main>
    </div>
  );
}

function MarketSummary({ results, fetchedAt }: { results: StockSearchItem[]; fetchedAt: string }) {
  const liveQuotes = results.filter((item) => item.price > 0);
  const avgChange =
    liveQuotes.length > 0
      ? liveQuotes.reduce((sum, item) => sum + item.changePercent, 0) / liveQuotes.length
      : 0;

  return (
    <Card>
      <CardContent className="grid h-full grid-cols-3 gap-3 py-5">
        <Stat label="当前列表" value={`${results.length}`} />
        <Stat label="实时可用" value={`${liveQuotes.length}`} />
        <Stat label="均涨跌" value={formatPercent(avgChange, liveQuotes.length)} tone={avgChange} />
        <p className="col-span-3 text-xs text-muted-foreground">
          数据来源东方财富，{formatFetchedAt(fetchedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone = 0 }: { label: string; value: string; tone?: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold ${tone === 0 ? "" : trendClass(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function SearchResults({ results }: { results: StockSearchItem[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-none border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">股票</th>
              <th className="px-4 py-3 text-left font-medium">市场</th>
              <th className="px-4 py-3 text-left font-medium">行业</th>
              <th className="px-4 py-3 text-right font-medium">最新价</th>
              <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
              <th className="px-4 py-3 text-right font-medium">成交额</th>
              <th className="px-4 py-3 text-right font-medium">详情</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.code} className="border-t transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link to={`/stock/${item.code}`} className="hover:text-primary">
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {item.code}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.marketLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.industry || item.area || "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatPrice(item.price)}</td>
                <td className={`px-4 py-3 text-right font-mono ${trendClass(item.changePercent)}`}>
                  {formatPercent(item.changePercent, item.price)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatTurnover(item.turnover)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`查看 ${item.name} 详情`}
                  >
                    <Link to={`/stock/${item.code}`}>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 md:hidden">
        {results.map((item) => (
          <Link
            key={item.code}
            to={`/stock/${item.code}`}
            className="flex items-center justify-between gap-3 rounded-none border bg-card px-3 py-3 transition-colors active:bg-muted/60"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{item.name}</span>
              <span className="mt-0.5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span>{item.code}</span>
                <span>{item.marketLabel}</span>
                {item.industry && <span className="truncate font-sans">{item.industry}</span>}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-sm">{formatPrice(item.price)}</span>
              <span className={`block font-mono text-xs ${trendClass(item.changePercent)}`}>
                {formatPercent(item.changePercent, item.price)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-none border bg-card text-sm text-muted-foreground">
      {query ? "没有找到匹配的沪深京 A 股股票" : "暂无 A 股快照数据"}
    </div>
  );
}

function formatFetchedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新时间待确认";
  return `更新 ${date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
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
