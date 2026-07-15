import type { Route } from "./+types/a-shares";
import * as React from "react";
import { useLoaderData } from "react-router";
import { ArrowRight, Layers, Loader2, Search, Star, X } from "lucide-react";

import { AppHeader } from "~/components/app-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AppLink as Link } from "~/components/ui/link";
import { buildMeta } from "~/lib/seo";
import { usePullToRefresh } from "~/hooks/use-pull-to-refresh";
import {
  getAshareMarketSnapshot,
  getSectorQuotes,
  type AShareSearchResponse,
  type RankingItem,
  type RankingKind,
  type SectorItem,
  type StockSearchItem,
} from "~/lib/stock-data";
import { formatAmount, formatPercent, trendClass } from "~/lib/format-ashare";

const SEARCH_LIMIT = 50;
const RANKING_LIMIT = 30;

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "A股行情",
    description: "搜索沪深京 A 股股票，查看实时行情、涨跌幅、成交额、板块行情与涨跌排行。",
    path: "/a-shares",
  });
}

export async function loader() {
  const [initialSearch, sectors] = await Promise.all([
    getAshareMarketSnapshot(SEARCH_LIMIT),
    getSectorQuotes("industry", 8),
  ]);
  return {
    initialSearch: {
      query: "",
      results: initialSearch,
      fetchedAt: new Date().toISOString(),
    } satisfies AShareSearchResponse,
    sectors,
    fetchedAt: new Date().toISOString(),
  };
}

export default function AShares() {
  const { initialSearch, sectors, fetchedAt } = useLoaderData<typeof loader>();
  const [query, setQuery] = React.useState("");
  const [payload, setPayload] = React.useState<AShareSearchResponse>(initialSearch);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");

  const refreshData = React.useCallback(async () => {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(SEARCH_LIMIT),
    });
    const res = await fetch(`/api/a-share-search?${params.toString()}`);
    if (!res.ok) throw new Error(`refresh failed: ${res.status}`);
    const data = (await res.json()) as AShareSearchResponse;
    setPayload(data);
  }, [query]);

  const { pullDistance, refreshing } = usePullToRefresh({
    enabled: true,
    onRefresh: refreshData,
  });

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
      <main
        className="mx-auto max-w-7xl px-4 py-6 sm:px-5 lg:py-8"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {refreshing && (
          <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            刷新中...
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">沪深京 A 股</Badge>
                  <span className="text-xs text-muted-foreground">
                    {trimmedQuery ? `搜索：${trimmedQuery}` : "涨幅快照"}
                  </span>
                </div>
                <Link
                  to="/watchlist"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <Star className="size-3" />
                  自选股
                </Link>
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

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <RankingsSection />
          <SectorQuickView sectors={sectors} fetchedAt={fetchedAt} />
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
        <Stat
          label="均涨跌"
          value={formatPercent(avgChange, liveQuotes.length > 0)}
          tone={avgChange}
        />
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
                  {formatPercent(item.changePercent, item.price > 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {item.turnover > 0 ? formatAmount(item.turnover) : "待更新"}
                </td>
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
                {formatPercent(item.changePercent, item.price > 0)}
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

// ==================== 涨跌排行 ====================

const RANKING_TABS: Array<{ key: RankingKind; label: string }> = [
  { key: "gainers", label: "涨幅榜" },
  { key: "losers", label: "跌幅榜" },
  { key: "turnoverRate", label: "换手率" },
  { key: "amount", label: "成交额" },
];

function RankingsSection() {
  const [kind, setKind] = React.useState<RankingKind>("gainers");
  const [items, setItems] = React.useState<RankingItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ kind, limit: String(RANKING_LIMIT) });
        const res = await fetch(`/api/a-share-ranking?${params.toString()}`);
        if (!res.ok) throw new Error("ranking failed");
        const data = (await res.json()) as { items: RankingItem[] };
        if (!cancelled) setItems(data.items);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">涨跌排行</CardTitle>
          <Link to="/a-shares" className="text-xs text-muted-foreground hover:text-primary">
            全部
          </Link>
        </div>
        <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RANKING_TABS.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant={kind === t.key ? "default" : "secondary"}
              size="xs"
              onClick={() => setKind(t.key)}
              className="shrink-0"
            >
              {t.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">排行加载中...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">暂无排行数据</div>
        ) : (
          <ol className="space-y-1">
            {items.slice(0, 10).map((item, idx) => (
              <li key={item.code}>
                <Link
                  to={`/stock/${item.code}`}
                  className="flex items-center gap-3 rounded-none px-2 py-1.5 transition-colors hover:bg-muted/40"
                >
                  <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                  </span>
                  <span className="shrink-0 font-mono text-sm">
                    {item.price > 0 ? item.price.toFixed(2) : "—"}
                  </span>
                  <span
                    className={`w-16 shrink-0 text-right font-mono text-xs ${trendClass(item.changePercent)}`}
                  >
                    {kind === "turnoverRate"
                      ? item.turnoverRate > 0
                        ? `${item.turnoverRate.toFixed(2)}%`
                        : "—"
                      : formatPercent(item.changePercent, item.price > 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 板块速览 ====================

function SectorQuickView({ sectors, fetchedAt }: { sectors: SectorItem[]; fetchedAt: string }) {
  const top = sectors.slice(0, 8);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-primary" />
            行业板块
          </CardTitle>
          <Link to="/sectors" className="text-xs text-muted-foreground hover:text-primary">
            全部板块
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground">{formatFetchedAt(fetchedAt)}</p>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">暂无板块数据</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {top.map((sector) => (
              <div
                key={sector.code}
                className="flex items-center justify-between gap-2 rounded-none border bg-card px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm font-medium">{sector.name}</span>
                <span className={`shrink-0 font-mono text-xs ${trendClass(sector.changePercent)}`}>
                  {formatPercent(sector.changePercent, false)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
