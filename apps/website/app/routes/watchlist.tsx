import type { Route } from "./+types/watchlist";
import * as React from "react";
import { ArrowDown, ArrowUp, Plus, RefreshCw, Search, Star, Trash2, X } from "lucide-react";

import { AShareShell } from "~/components/stock/a-share-shell";
import { Button } from "~/components/ui/button";
import { AppLink as Link } from "~/components/ui/link";
import { buildMeta } from "~/lib/seo";
import { formatAmount, formatPercent, formatPrice, trendClass } from "~/lib/format-ashare";
import type { AShareSearchResponse, StockQuote, StockSearchItem } from "~/lib/stock-data";
import type { MarketDataMeta } from "~/lib/stock-market";
import { useWatchlistHydration, useWatchlistStore } from "~/stores/watchlist";

type QuoteMap = Record<string, StockQuote>;

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "A 股自选",
    description: "管理本机 A 股自选列表并查看实时行情。",
    path: "/watchlist",
  });
}

export default function Watchlist() {
  const hydrated = useWatchlistHydration();
  const stocks = useWatchlistStore((state) => state.stocks);
  const add = useWatchlistStore((state) => state.add);
  const remove = useWatchlistStore((state) => state.remove);
  const move = useWatchlistStore((state) => state.move);
  const clear = useWatchlistStore((state) => state.clear);
  const [quotes, setQuotes] = React.useState<QuoteMap>({});
  const [meta, setMeta] = React.useState<MarketDataMeta | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const codesKey = stocks.map((item) => item.code).join(",");

  const refresh = React.useCallback(async () => {
    if (!codesKey) {
      setQuotes({});
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/a-share-quotes?codes=${encodeURIComponent(codesKey)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("quotes failed");
      const data = (await response.json()) as { quotes: StockQuote[]; meta: MarketDataMeta };
      const next: QuoteMap = {};
      for (const quote of data.quotes) next[quote.code] = quote;
      setQuotes((current) => ({ ...current, ...next }));
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [codesKey]);

  React.useEffect(() => {
    if (!hydrated || !codesKey) return;
    let cancelled = false;
    let timer: number | null = null;
    const tick = async () => {
      if (!cancelled && document.visibilityState === "visible")
        await refresh().catch(() => undefined);
      if (!cancelled) timer = window.setTimeout(tick, 5_000);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [codesKey, hydrated, refresh]);

  return (
    <AShareShell currentLabel="自选股">
      <div className="space-y-4">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Star className="size-3 text-primary" /> 本机持久化
              {meta ? <span>· {meta.freshness === "live" ? "实时" : "行情可能延迟"}</span> : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">自选股</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hydrated ? `${stocks.length} 只股票` : "正在读取自选列表"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading || stocks.length === 0}
            >
              <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} /> 刷新
            </Button>
            {stocks.length > 0 ? (
              confirmClear ? (
                <div className="flex items-center gap-1 border border-[color:var(--market-up)]/50 p-1">
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => {
                      clear();
                      setConfirmClear(false);
                    }}
                  >
                    确认清空
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="取消清空"
                    onClick={() => setConfirmClear(false)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
                  <Trash2 className="size-3.5" /> 清空
                </Button>
              )
            ) : null}
          </div>
        </section>

        <WatchlistSearch
          onAdd={(item) => add(item.code, item.name)}
          existing={new Set(stocks.map((item) => item.code))}
        />

        {!hydrated ? (
          <div className="market-panel flex min-h-48 items-center justify-center text-xs text-muted-foreground">
            正在读取自选列表
          </div>
        ) : stocks.length === 0 ? (
          <div className="market-panel flex min-h-56 flex-col items-center justify-center text-center">
            <Star className="size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">还没有自选股</p>
            <p className="mt-1 text-xs text-muted-foreground">
              使用上方搜索添加，或从个股详情页加入。
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/a-shares">浏览 A 股行情</Link>
            </Button>
          </div>
        ) : (
          <WatchlistTable stocks={stocks} quotes={quotes} onRemove={remove} onMove={move} />
        )}
      </div>
    </AShareShell>
  );
}

function WatchlistSearch({
  onAdd,
  existing,
}: {
  onAdd: (item: StockSearchItem) => boolean;
  existing: Set<string>;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<StockSearchItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/a-share-search?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as AShareSearchResponse;
        setResults(data.results);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section className="market-panel p-3">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索股票并加入自选"
          aria-label="搜索并添加自选股"
          className="h-9 w-full border border-border bg-muted/30 pl-9 pr-10 text-xs outline-none focus:border-primary/70"
        />
        {loading ? (
          <RefreshCw className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {query && results.length > 0 ? (
        <div className="mt-2 grid gap-px border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => {
            const added = existing.has(item.code);
            return (
              <button
                key={item.code}
                type="button"
                disabled={added}
                onClick={() => {
                  onAdd(item);
                  setQuery("");
                }}
                className="flex items-center justify-between gap-3 bg-card px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{item.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{item.code}</span>
                </span>
                {added ? (
                  <span className="text-[10px] text-muted-foreground">已添加</span>
                ) : (
                  <Plus className="size-3.5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function WatchlistTable({
  stocks,
  quotes,
  onRemove,
  onMove,
}: {
  stocks: Array<{ code: string; name: string; createdAt: number }>;
  quotes: QuoteMap;
  onRemove: (code: string) => void;
  onMove: (code: string, direction: "up" | "down") => void;
}) {
  return (
    <section className="market-panel overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="border-b border-border/70 bg-muted/35 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">股票</th>
              <th className="px-3 py-2.5 text-right font-medium">最新</th>
              <th className="px-3 py-2.5 text-right font-medium">涨跌幅</th>
              <th className="px-3 py-2.5 text-right font-medium">成交额</th>
              <th className="px-4 py-2.5 text-right font-medium">管理</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, index) => {
              const quote = quotes[stock.code];
              return (
                <tr
                  key={stock.code}
                  className="market-table-row border-b border-border/45 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link to={`/stock/${stock.code}`}>
                      <span className="font-medium hover:text-primary">
                        {quote?.name && quote.name !== stock.code ? quote.name : stock.name}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {stock.code}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm">
                    {formatPrice(quote?.price)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-mono ${trendClass(quote?.changePercent)}`}
                  >
                    {formatPercent(quote?.changePercent)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                    {formatAmount(quote?.turnover)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`上移 ${stock.name}`}
                        disabled={index === 0}
                        onClick={() => onMove(stock.code, "up")}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`下移 ${stock.name}`}
                        disabled={index === stocks.length - 1}
                        onClick={() => onMove(stock.code, "down")}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`移除 ${stock.name}`}
                        onClick={() => onRemove(stock.code)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-border/50 md:hidden">
        {stocks.map((stock, index) => {
          const quote = quotes[stock.code];
          return (
            <div key={stock.code} className="flex items-center gap-2 px-3 py-3">
              <Link to={`/stock/${stock.code}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {quote?.name && quote.name !== stock.code ? quote.name : stock.name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{stock.code}</span>
              </Link>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm">{formatPrice(quote?.price)}</span>
                <span className={`block font-mono text-xs ${trendClass(quote?.changePercent)}`}>
                  {formatPercent(quote?.changePercent)}
                </span>
              </span>
              <div className="flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`上移 ${stock.name}`}
                  disabled={index === 0}
                  onClick={() => onMove(stock.code, "up")}
                >
                  <ArrowUp className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`移除 ${stock.name}`}
                  onClick={() => onRemove(stock.code)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
