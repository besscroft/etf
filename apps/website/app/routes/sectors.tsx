import type { Route } from "./+types/sectors";
import * as React from "react";
import { ArrowUpRight, Layers3, RefreshCw } from "lucide-react";
import { useLoaderData } from "react-router";

import { AShareShell } from "~/components/stock/a-share-shell";
import { Button } from "~/components/ui/button";
import { AppLink as Link } from "~/components/ui/link";
import { usePullToRefresh } from "~/hooks/use-pull-to-refresh";
import { formatAmount, formatPercent, trendClass } from "~/lib/format-ashare";
import { buildMeta } from "~/lib/seo";
import { getSectorQuotes, type SectorItem, type SectorType } from "~/lib/stock-data";
import type { MarketDataMeta } from "~/lib/stock-market";
import { cn } from "~/lib/utils";

const TABS: Array<{ key: SectorType; label: string }> = [
  { key: "industry", label: "行业" },
  { key: "concept", label: "概念" },
  { key: "region", label: "地区" },
];

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "A 股板块行情",
    description: "A 股行业、概念和地区板块涨跌、资金与领涨股。",
    path: "/sectors",
  });
}

export async function loader() {
  const [industry, concept, region] = await Promise.all([
    getSectorQuotes("industry"),
    getSectorQuotes("concept"),
    getSectorQuotes("region"),
  ]);
  return { industry, concept, region, fetchedAt: new Date().toISOString() };
}

export default function Sectors() {
  const initial = useLoaderData<typeof loader>();
  const [tab, setTab] = React.useState<SectorType>("industry");
  const [data, setData] = React.useState<Record<SectorType, SectorItem[]>>({
    industry: initial.industry,
    concept: initial.concept,
    region: initial.region,
  });
  const [meta, setMeta] = React.useState<MarketDataMeta | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/a-share-sectors?type=${tab}&limit=100`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("sector refresh failed");
      const payload = (await response.json()) as { items: SectorItem[]; meta: MarketDataMeta };
      setData((current) => ({ ...current, [tab]: payload.items }));
      setMeta(payload.meta);
    } catch {
      setError("板块刷新失败，已保留上次有效数据");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const { pullDistance, refreshing } = usePullToRefresh({ enabled: true, onRefresh: refresh });
  const items = data[tab];

  return (
    <AShareShell currentLabel="板块行情" pullOffset={pullDistance}>
      <div className="space-y-4">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Layers3 className="size-3 text-primary" /> 东方财富板块行情
              <span>· {meta?.freshness === "live" ? "实时" : "按最新有效数据"}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">板块行情</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              行业、概念与地区板块的涨跌、主力净流入和领涨股。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("size-3.5", (loading || refreshing) && "animate-spin")} /> 刷新
          </Button>
        </section>

        <div className="market-segment w-fit">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "px-3 py-1.5 text-xs transition-colors",
                tab === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="border border-[color:var(--market-up)]/40 bg-[color:var(--market-up)]/10 px-3 py-2 text-xs text-[color:var(--market-up-bright)]">
            {error}
          </p>
        ) : null}

        <section className="market-panel overflow-hidden">
          <div className="market-panel-header">
            <h2 className="text-sm font-semibold">
              {TABS.find((item) => item.key === tab)?.label}板块
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground">{items.length} 个</span>
          </div>
          <SectorTable items={items} />
        </section>
      </div>
    </AShareShell>
  );
}

function SectorTable({ items }: { items: SectorItem[] }) {
  if (items.length === 0)
    return <div className="px-4 py-16 text-center text-xs text-muted-foreground">暂无板块行情</div>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="border-b border-border/70 bg-muted/35 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">板块</th>
              <th className="px-3 py-2.5 text-right font-medium">涨跌幅</th>
              <th className="px-3 py-2.5 text-right font-medium">主力净流入</th>
              <th className="px-4 py-2.5 text-left font-medium">领涨股</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.code}
                className="market-table-row border-b border-border/45 last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {item.code}
                  </span>
                </td>
                <td className={`px-3 py-3 text-right font-mono ${trendClass(item.changePercent)}`}>
                  {formatPercent(item.changePercent)}
                </td>
                <td className={`px-3 py-3 text-right font-mono ${trendClass(item.mainNet)}`}>
                  {formatAmount(item.mainNet)}
                </td>
                <td className="px-4 py-3">
                  {item.leaderCode && item.leaderName ? (
                    <Link
                      to={`/stock/${item.leaderCode}`}
                      className="inline-flex items-center gap-2 hover:text-primary"
                    >
                      <span>{item.leaderName}</span>
                      <span
                        className={`font-mono text-[11px] ${trendClass(item.leaderChangePercent)}`}
                      >
                        {formatPercent(item.leaderChangePercent)}
                      </span>
                      <ArrowUpRight className="size-3" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-border/50 md:hidden">
        {items.map((item) => (
          <div key={item.code} className="px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
              <span className={`font-mono text-sm ${trendClass(item.changePercent)}`}>
                {formatPercent(item.changePercent)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span>
                主力 <span className={trendClass(item.mainNet)}>{formatAmount(item.mainNet)}</span>
              </span>
              {item.leaderCode && item.leaderName ? (
                <Link
                  to={`/stock/${item.leaderCode}`}
                  className="min-w-0 truncate hover:text-primary"
                >
                  领涨 {item.leaderName}{" "}
                  <span className={trendClass(item.leaderChangePercent)}>
                    {formatPercent(item.leaderChangePercent)}
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
