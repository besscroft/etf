import type { Route } from "./+types/a-shares";
import * as React from "react";
import { ArrowUpRight, RefreshCw, Search, Star } from "lucide-react";
import { useLoaderData } from "react-router";

import { AShareShell } from "~/components/stock/a-share-shell";
import { Button } from "~/components/ui/button";
import { AppLink as Link } from "~/components/ui/link";
import { usePullToRefresh } from "~/hooks/use-pull-to-refresh";
import { buildMeta } from "~/lib/seo";
import {
  getAshareMarketSnapshot,
  getSectorQuotes,
  type AShareSearchResponse,
  type RankingItem,
  type RankingKind,
  type SectorItem,
  type StockSearchItem,
} from "~/lib/stock-data";
import { formatAmount, formatPercent, formatPrice, trendClass } from "~/lib/format-ashare";
import { cn } from "~/lib/utils";

const SNAPSHOT_LIMIT = 40;
const RANKING_LIMIT = 30;
const RANKING_TABS: Array<{ key: RankingKind; label: string }> = [
  { key: "gainers", label: "涨幅" },
  { key: "losers", label: "跌幅" },
  { key: "turnoverRate", label: "换手" },
  { key: "amount", label: "成交额" },
];

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "A 股行情工作台",
    description: "沪深京 A 股实时行情、涨跌排行、板块和自选股工作台。",
    path: "/a-shares",
  });
}

export async function loader() {
  const [snapshot, sectors] = await Promise.all([
    getAshareMarketSnapshot(SNAPSHOT_LIMIT),
    getSectorQuotes("industry", 8),
  ]);
  return {
    initialSearch: {
      query: "",
      results: snapshot,
      fetchedAt: new Date().toISOString(),
    } satisfies AShareSearchResponse,
    sectors,
    fetchedAt: new Date().toISOString(),
  };
}

export default function AShares() {
  const {
    initialSearch,
    sectors: initialSectors,
    fetchedAt: initialFetchedAt,
  } = useLoaderData<typeof loader>();
  const [payload, setPayload] = React.useState<AShareSearchResponse>(initialSearch);
  const [sectors, setSectors] = React.useState<SectorItem[]>(initialSectors);
  const [rankKind, setRankKind] = React.useState<RankingKind>("gainers");
  const [rankings, setRankings] = React.useState<RankingItem[]>([]);
  const [rankingLoading, setRankingLoading] = React.useState(true);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);

  const loadRankings = React.useCallback(async (kind: RankingKind, signal?: AbortSignal) => {
    setRankingLoading(true);
    try {
      const params = new URLSearchParams({ kind, limit: String(RANKING_LIMIT) });
      const response = await fetch(`/api/a-share-ranking?${params}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("ranking failed");
      const data = (await response.json()) as { items: RankingItem[] };
      setRankings(data.items);
    } catch (error) {
      if ((error as { name?: string }).name !== "AbortError") setRankings([]);
    } finally {
      setRankingLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadRankings(rankKind, controller.signal);
    return () => controller.abort();
  }, [loadRankings, rankKind]);

  const refresh = React.useCallback(async () => {
    setRefreshError(null);
    try {
      const [searchResponse, sectorResponse] = await Promise.all([
        fetch(`/api/a-share-search?limit=${SNAPSHOT_LIMIT}`, { cache: "no-store" }),
        fetch(`/api/a-share-sectors?type=industry&limit=8`, { cache: "no-store" }),
      ]);
      if (!searchResponse.ok || !sectorResponse.ok) throw new Error("refresh failed");
      const searchData = (await searchResponse.json()) as AShareSearchResponse;
      const sectorData = (await sectorResponse.json()) as { items: SectorItem[] };
      setPayload(searchData);
      setSectors(sectorData.items);
      await loadRankings(rankKind);
    } catch {
      setRefreshError("刷新失败，已保留上次有效行情");
    }
  }, [loadRankings, rankKind]);

  const { pullDistance, refreshing } = usePullToRefresh({ enabled: true, onRefresh: refresh });
  const results = payload.results;
  const available = results.filter((item) => item.price !== null).length;
  const averageChange =
    results.reduce((sum, item) => sum + (item.changePercent ?? 0), 0) / Math.max(1, available);
  const fetchedAt = payload.fetchedAt || initialFetchedAt;

  return (
    <AShareShell currentLabel="A 股行情" pullOffset={pullDistance}>
      <div className="space-y-4">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-1.5 bg-primary" />
              沪深京市场
              <span className="font-mono">{formatFetchedAt(fetchedAt)}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">A 股行情</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              实时快照、涨跌排行和板块资金，按市场状态显示数据新鲜度。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {refreshing ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" /> 刷新中
              </span>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
              <RefreshCw className="size-3.5" /> 刷新行情
            </Button>
            <Button asChild size="sm">
              <Link to="/watchlist">
                <Star className="size-3.5" /> 自选股
              </Link>
            </Button>
          </div>
        </section>

        {refreshError ? (
          <p className="border border-[color:var(--market-up)]/40 bg-[color:var(--market-up)]/10 px-3 py-2 text-xs text-[color:var(--market-up-bright)]">
            {refreshError}
          </p>
        ) : null}

        <section className="grid grid-cols-2 gap-px border border-border/70 bg-border/70 sm:grid-cols-4">
          <MarketStat label="列表股票" value={String(results.length)} />
          <MarketStat label="行情可用" value={`${available}/${results.length}`} />
          <MarketStat
            label="列表均涨跌"
            value={formatPercent(available ? averageChange : null)}
            tone={averageChange}
          />
          <MarketStat label="数据源" value={available ? sourceLabel(results) : "不可用"} />
        </section>

        <section className="market-panel overflow-hidden">
          <div className="market-panel-header">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">全市场快照</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">{results.length} 只</span>
          </div>
          <MarketSnapshotTable results={results} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <RankingPanel
            kind={rankKind}
            items={rankings}
            loading={rankingLoading}
            onKindChange={setRankKind}
          />
          <SectorPanel sectors={sectors} fetchedAt={fetchedAt} />
        </section>
      </div>
    </AShareShell>
  );
}

function MarketStat({
  label,
  value,
  tone = 0,
}: {
  label: string;
  value: string;
  tone?: number | null;
}) {
  return (
    <div className="bg-card px-3 py-3 sm:px-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-base font-semibold ${tone ? trendClass(tone) : ""}`}>
        {value}
      </p>
    </div>
  );
}

function MarketSnapshotTable({ results }: { results: StockSearchItem[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-xs">
          <thead className="border-b border-border/70 bg-muted/35 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">股票</th>
              <th className="px-3 py-2.5 text-left font-medium">市场</th>
              <th className="px-3 py-2.5 text-right font-medium">最新</th>
              <th className="px-3 py-2.5 text-right font-medium">涨跌幅</th>
              <th className="px-3 py-2.5 text-right font-medium">成交额</th>
              <th className="px-3 py-2.5 text-right font-medium">换手率</th>
              <th className="px-4 py-2.5 text-right font-medium">详情</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr
                key={item.code}
                className="market-table-row border-b border-border/45 last:border-0"
              >
                <td className="px-4 py-2.5">
                  <Link
                    to={`/stock/${item.code}`}
                    className="group flex min-w-0 items-center gap-2"
                  >
                    <span className="min-w-0 truncate font-medium group-hover:text-primary">
                      {item.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {item.code}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{item.marketLabel}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm">
                  {formatPrice(item.price)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-mono ${trendClass(item.changePercent)}`}
                >
                  {formatPercent(item.changePercent)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                  {formatAmount(item.turnover)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                  {formatPercent(item.turnoverRate, false)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`查看 ${item.name} 详情`}
                  >
                    <Link to={`/stock/${item.code}`}>
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-border/50 md:hidden">
        {results.map((item) => (
          <Link
            key={item.code}
            to={`/stock/${item.code}`}
            className="flex items-center justify-between gap-3 px-3 py-3 active:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{item.name}</span>
              <span className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <span>{item.code}</span>
                <span>{item.marketLabel}</span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-sm">{formatPrice(item.price)}</span>
              <span className={`block font-mono text-xs ${trendClass(item.changePercent)}`}>
                {formatPercent(item.changePercent)}
              </span>
            </span>
          </Link>
        ))}
      </div>
      {results.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted-foreground">暂无有效行情</p>
      ) : null}
    </>
  );
}

function RankingPanel({
  kind,
  items,
  loading,
  onKindChange,
}: {
  kind: RankingKind;
  items: RankingItem[];
  loading: boolean;
  onKindChange: (kind: RankingKind) => void;
}) {
  return (
    <section className="market-panel overflow-hidden">
      <div className="market-panel-header">
        <h2 className="text-sm font-semibold">涨跌排行</h2>
        <div className="market-segment overflow-x-auto">
          {RANKING_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onKindChange(tab.key)}
              className={cnSegment(kind === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="px-4 py-12 text-center text-xs text-muted-foreground">排行加载中</div>
      ) : items.length === 0 ? (
        <div className="px-4 py-12 text-center text-xs text-muted-foreground">暂无排行数据</div>
      ) : (
        <ol className="divide-y divide-border/50">
          {items.slice(0, 12).map((item, index) => (
            <li key={item.code}>
              <Link
                to={`/stock/${item.code}`}
                className="market-table-row flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-5 font-mono text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{item.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{item.code}</span>
                </span>
                <span className="font-mono text-xs">{formatPrice(item.price)}</span>
                <span
                  className={`w-16 text-right font-mono text-xs ${trendClass(item.changePercent)}`}
                >
                  {kind === "turnoverRate"
                    ? formatPercent(item.turnoverRate, false)
                    : formatPercent(item.changePercent)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function SectorPanel({ sectors, fetchedAt }: { sectors: SectorItem[]; fetchedAt: string }) {
  return (
    <section className="market-panel overflow-hidden">
      <div className="market-panel-header">
        <div>
          <h2 className="text-sm font-semibold">行业板块</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{formatFetchedAt(fetchedAt)}</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/sectors">
            查看全部 <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      {sectors.length === 0 ? (
        <div className="px-4 py-12 text-center text-xs text-muted-foreground">暂无板块数据</div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-3">
          {sectors.slice(0, 9).map((sector) => (
            <Link
              key={sector.code}
              to="/sectors"
              className="bg-card px-3 py-3 transition-colors hover:bg-muted/40"
            >
              <span className="block truncate text-xs font-medium">{sector.name}</span>
              <span className={`mt-1 block font-mono text-sm ${trendClass(sector.changePercent)}`}>
                {formatPercent(sector.changePercent)}
              </span>
              <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                领涨 {sector.leaderName || "—"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function sourceLabel(results: StockSearchItem[]) {
  const sources = Array.from(
    new Set(results.filter((item) => item.price !== null).map((item) => item.source)),
  );
  if (sources.includes("eastmoney")) return "东方财富";
  if (sources.includes("sina")) return "新浪行情";
  return "不可用";
}

function formatFetchedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "更新时间待确认"
    : date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function cnSegment(active: boolean) {
  return cn(
    "shrink-0 px-2 py-1 text-[11px] transition-colors",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
  );
}
