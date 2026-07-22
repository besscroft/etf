import * as React from "react";
import type { ECElementEvent, EChartsOption } from "echarts";

import { useIsMobile } from "~/hooks/use-media-query";
import { ChartShell, CHART_HEIGHTS } from "./chart-shell";
import { chartPalette, formatPercent, makeBaseTextStyle } from "./chart-utils";

interface HoldingLike {
  changePercent?: number;
  holdingRatio: number;
  name: string;
  price?: number;
  symbol: string;
}

interface HoldingsPieChartProps {
  height?: number | string;
  holdings: HoldingLike[];
  onDrilldown?: (holding: HoldingLike) => void;
}

export function HoldingsPieChart({
  height = CHART_HEIGHTS.compact,
  holdings,
  onDrilldown,
}: HoldingsPieChartProps) {
  const isMobile = useIsMobile();
  const data = React.useMemo(
    () =>
      holdings
        .filter((holding) => Number.isFinite(holding.holdingRatio) && holding.holdingRatio > 0)
        .slice(0, 12),
    [holdings],
  );
  const empty = data.length === 0;

  const option = React.useMemo<EChartsOption>(
    () =>
      ({
        animation: data.length <= 12,
        aria: { enabled: true },
        color: chartPalette,
        legend: {
          bottom: 0,
          left: "center",
          orient: "horizontal",
          textStyle: makeBaseTextStyle(),
          type: "scroll",
        },
        textStyle: makeBaseTextStyle(),
        tooltip: {
          appendToBody: true,
          backgroundColor: "var(--popover)",
          borderColor: "var(--border)",
          borderWidth: 1,
          confine: true,
          textStyle: { color: "var(--popover-foreground)", fontSize: 12 },
          trigger: "item",
          formatter: (params: unknown) => {
            const item = params as { name?: string; value?: number; percent?: number };
            return `<div style="font-weight:600;margin-bottom:4px">${item.name ?? ""}</div><div>占比：${formatPercent(item.value)}</div><div>组合权重：${item.percent?.toFixed(1) ?? "--"}%</div>`;
          },
        },
        series: [
          {
            avoidLabelOverlap: true,
            data: data.map((holding) => ({
              drilldownKey: holding.symbol,
              name: holding.name,
              symbol: holding.symbol,
              value: Number(holding.holdingRatio.toFixed(2)),
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 12,
                shadowColor: "rgba(15,23,42,.18)",
              },
            },
            label: {
              formatter: "{b}\n{d}%",
              show: !isMobile,
            },
            minAngle: 4,
            name: "占比",
            radius: isMobile ? ["42%", "68%"] : ["46%", "72%"],
            selectedMode: "single",
            type: "pie",
            universalTransition: true,
          },
        ],
      }) as EChartsOption,
    [data, isMobile],
  );

  const events = React.useMemo(
    () =>
      onDrilldown
        ? {
            click: (event: ECElementEvent) => {
              const symbol = (event.data as { symbol?: string } | undefined)?.symbol;
              const holding = data.find((item) => item.symbol === symbol);
              if (holding) onDrilldown(holding);
            },
          }
        : undefined,
    [data, onDrilldown],
  );

  return (
    <ChartShell empty={empty} events={events} height={height} option={option} variant="compact" />
  );
}

export type { HoldingLike };
