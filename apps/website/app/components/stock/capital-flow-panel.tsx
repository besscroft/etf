/**
 * 资金流向面板（2026-07-15 新增）
 *
 * 顶部：当日主力净流入概览（超大单 / 大单 / 中单 / 小单）
 * 中部：N 日主力净流入趋势柱状图
 */

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { CapitalFlowChart } from "~/components/charts/capital-flow-chart";
import { cn } from "~/lib/utils";
import { formatAmount, trendClass } from "~/lib/format-ashare";
import type { CapitalFlowTrendPoint, StockCapitalFlow } from "~/lib/stock-data";

interface CapitalFlowPanelProps {
  flow: StockCapitalFlow | null;
  trend: CapitalFlowTrendPoint[];
  loading?: boolean;
  trendDays?: number;
}

export function CapitalFlowPanel({ flow, trend, loading, trendDays = 30 }: CapitalFlowPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">资金流向</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!flow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">资金流向</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-xs text-muted-foreground">暂无资金流向数据</div>
        </CardContent>
      </Card>
    );
  }

  const legs = [
    { label: "超大单", leg: flow.huge, color: "text-[color:var(--market-up)]" },
    { label: "大单", leg: flow.big, color: "text-[color:var(--market-up)]" },
    { label: "中单", leg: flow.medium, color: "text-muted-foreground" },
    { label: "小单", leg: flow.small, color: "text-[color:var(--market-down)]" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">资金流向</CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {flow.date} · 主力{flow.mainNet >= 0 ? "净流入" : "净流出"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 主力净流入大字 */}
        <div className="rounded-none border bg-muted/30 px-3 py-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">主力净流入</span>
            <span className={cn("font-mono text-lg font-semibold", trendClass(flow.mainNet))}>
              {formatSignedAmount(flow.mainNet)}
            </span>
          </div>
        </div>

        {/* 四类资金 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {legs.map(({ label, leg, color }) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-dashed py-1.5 last:border-0 sm:border-0 sm:py-0"
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={cn("font-mono tabular-nums", color)}>
                {formatSignedAmount(leg.net)}
              </span>
            </div>
          ))}
        </div>

        {/* 趋势图 */}
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">近 {trendDays} 日主力净流入</p>
          <CapitalFlowChart data={trend} />
        </div>
      </CardContent>
    </Card>
  );
}

function formatSignedAmount(value: number) {
  if (!Number.isFinite(value) || value === 0) return "—";
  return `${value > 0 ? "+" : ""}${formatAmount(value)}`;
}
