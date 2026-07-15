import type { Route } from "./+types/sectors";
import * as React from "react";
import { useLoaderData } from "react-router";
import { ArrowUpRight, Layers } from "lucide-react";

import { AppHeader } from "~/components/app-header";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AppLink as Link } from "~/components/ui/link";
import { buildMeta } from "~/lib/seo";
import { getSectorQuotes, type SectorItem, type SectorType } from "~/lib/stock-data";
import { formatAmount, formatPercent, trendClass } from "~/lib/format-ashare";

const SECTOR_TABS: Array<{ key: SectorType; label: string }> = [
  { key: "industry", label: "行业板块" },
  { key: "concept", label: "概念板块" },
  { key: "region", label: "地区板块" },
];

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "板块行情",
    description: "查看 A 股行业、概念、地区板块的实时涨跌幅、主力资金净流入与领涨个股。",
    path: "/sectors",
  });
}

export async function loader() {
  const [industry, concept, region] = await Promise.all([
    getSectorQuotes("industry"),
    getSectorQuotes("concept"),
    getSectorQuotes("region"),
  ]);
  return {
    industry,
    concept,
    region,
    fetchedAt: new Date().toISOString(),
  };
}

export default function Sectors() {
  const { industry, concept, region, fetchedAt } = useLoaderData<typeof loader>();
  const [tab, setTab] = React.useState<SectorType>("industry");

  const data: Record<SectorType, SectorItem[]> = { industry, concept, region };
  const items = data[tab] ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="板块行情" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 lg:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">板块行情</Badge>
          <span className="text-xs text-muted-foreground">
            数据来源东方财富 · 更新{" "}
            {new Date(fetchedAt).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="mb-3 flex flex-nowrap gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTOR_TABS.map((t) => (
            <Button
              key={t.key}
              type="button"
              variant={tab === t.key ? "default" : "secondary"}
              size="sm"
              onClick={() => setTab(t.key)}
              className="shrink-0"
            >
              {t.label}
            </Button>
          ))}
        </div>

        {items.length > 0 ? (
          <SectorTable items={items} />
        ) : (
          <div className="flex min-h-48 items-center justify-center rounded-none border bg-card text-sm text-muted-foreground">
            暂无板块数据
          </div>
        )}
      </main>
    </div>
  );
}

function SectorTable({ items }: { items: SectorItem[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-none border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">板块</th>
              <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
              <th className="px-4 py-3 text-right font-medium">主力净流入</th>
              <th className="px-4 py-3 text-left font-medium">领涨股</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.code} className="border-t transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{item.code}</span>
                </td>
                <td className={`px-4 py-3 text-right font-mono ${trendClass(item.changePercent)}`}>
                  {formatPercent(item.changePercent, false)}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${trendClass(item.mainNet)}`}>
                  {item.mainNet >= 0 ? "+" : ""}
                  {formatAmount(item.mainNet)}
                </td>
                <td className="px-4 py-3">
                  {item.leaderName ? (
                    <Link
                      to={`/stock/${item.leaderCode}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <span className="truncate">{item.leaderName}</span>
                      <span className={`font-mono text-xs ${trendClass(item.leaderChangePercent)}`}>
                        {formatPercent(item.leaderChangePercent, false)}
                      </span>
                      <ArrowUpRight className="size-3 text-muted-foreground" />
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

      <div className="grid gap-2 md:hidden">
        {items.map((item) => (
          <div key={item.code} className="rounded-none border bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
              </div>
              <span className={`font-mono text-sm ${trendClass(item.changePercent)}`}>
                {formatPercent(item.changePercent, false)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                主力{" "}
                <span className={trendClass(item.mainNet)}>
                  {item.mainNet >= 0 ? "+" : ""}
                  {formatAmount(item.mainNet)}
                </span>
              </span>
              {item.leaderName && (
                <Link
                  to={`/stock/${item.leaderCode}`}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Layers className="size-3" />
                  <span className="truncate">{item.leaderName}</span>
                  <span className={trendClass(item.leaderChangePercent)}>
                    {formatPercent(item.leaderChangePercent, false)}
                  </span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
