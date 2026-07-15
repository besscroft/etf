import type { Route } from "./+types/watchlist";
import * as React from "react";
import { useLoaderData } from "react-router";
import { Star, Trash2, Search } from "lucide-react";

import { AppHeader } from "~/components/app-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import { AppLink as Link } from "~/components/ui/link";
import { buildMeta } from "~/lib/seo";
import { useWatchlistHydration, useWatchlistStore } from "~/stores/watchlist";
import { formatAmount, formatPercent, trendClass } from "~/lib/format-ashare";
import type { StockQuote } from "~/lib/stock-data";

interface QuoteMap {
  [code: string]: StockQuote;
}

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "自选股",
    description: "管理你关注的 A 股自选列表，实时查看自选股报价与涨跌幅。",
    path: "/watchlist",
  });
}

export async function loader() {
  return { fetchedAt: new Date().toISOString() };
}

export default function Watchlist() {
  const hydrated = useWatchlistHydration();
  const stocks = useWatchlistStore((state) => state.stocks);
  const remove = useWatchlistStore((state) => state.remove);

  const [quotes, setQuotes] = React.useState<QuoteMap>({});
  const [loading, setLoading] = React.useState(false);

  const codes = stocks.map((s) => s.code);

  React.useEffect(() => {
    if (!hydrated || codes.length === 0) {
      setQuotes({});
      return;
    }
    let cancelled = false;
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ codes: codes.join(",") });
        const res = await fetch(`/api/a-share-quotes?${params.toString()}`);
        if (!res.ok) throw new Error("quotes failed");
        const data = (await res.json()) as { quotes: StockQuote[] };
        if (!cancelled) {
          const map: QuoteMap = {};
          for (const q of data.quotes) map[q.code] = q;
          setQuotes(map);
        }
      } catch {
        // 静默
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchQuotes();
    const timer = setInterval(fetchQuotes, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hydrated, codes.join(",")]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="自选股" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 lg:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">自选股</Badge>
          <span className="text-xs text-muted-foreground">
            {hydrated ? `共 ${stocks.length} 只` : "加载中..."}
          </span>
        </div>

        {!hydrated ? (
          <div className="flex min-h-48 items-center justify-center rounded-none border bg-card text-sm text-muted-foreground">
            正在读取自选列表...
          </div>
        ) : stocks.length === 0 ? (
          <EmptyState />
        ) : (
          <WatchlistTable stocks={stocks} quotes={quotes} loading={loading} onRemove={remove} />
        )}
      </main>
    </div>
  );
}

function WatchlistTable({
  stocks,
  quotes,
  loading,
  onRemove,
}: {
  stocks: Array<{ code: string; name: string; createdAt: number }>;
  quotes: QuoteMap;
  loading: boolean;
  onRemove: (code: string) => void;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-none border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">股票</th>
              <th className="px-4 py-3 text-right font-medium">最新价</th>
              <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
              <th className="px-4 py-3 text-right font-medium">成交额</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const q = quotes[stock.code];
              return (
                <tr key={stock.code} className="border-t transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to={`/stock/${stock.code}`} className="hover:text-primary">
                      <span className="font-medium">
                        {q?.name && q.name !== stock.code ? q.name : stock.name}
                      </span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {stock.code}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {q && q.price > 0 ? q.price.toFixed(2) : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${q ? trendClass(q.changePercent) : ""}`}
                  >
                    {q ? formatPercent(q.changePercent) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {q && q.turnover > 0 ? formatAmount(q.turnover) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`移除 ${stock.code}`}
                      onClick={() => onRemove(stock.code)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 md:hidden">
        {stocks.map((stock) => {
          const q = quotes[stock.code];
          return (
            <div
              key={stock.code}
              className="flex items-center justify-between gap-3 rounded-none border bg-card px-3 py-3"
            >
              <Link to={`/stock/${stock.code}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {q?.name && q.name !== stock.code ? q.name : stock.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{stock.code}</span>
              </Link>
              <div className="shrink-0 text-right">
                <span className="block font-mono text-sm">
                  {q && q.price > 0 ? q.price.toFixed(2) : "—"}
                </span>
                <span className={`block font-mono text-xs ${q ? trendClass(q.changePercent) : ""}`}>
                  {q ? formatPercent(q.changePercent) : "—"}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`移除 ${stock.code}`}
                onClick={() => onRemove(stock.code)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {loading && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">行情刷新中...</p>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-none border bg-card text-center">
      <Star className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm">还没有自选股</p>
      <p className="mt-1 text-xs text-muted-foreground">在个股详情页点击星标即可加入自选</p>
      <Link
        to="/a-shares"
        className="mt-4 inline-flex items-center gap-1.5 rounded-none border bg-background px-3 py-1.5 text-sm hover:bg-muted"
      >
        <Search className="size-3.5" />
        去搜索股票
      </Link>
    </div>
  );
}
