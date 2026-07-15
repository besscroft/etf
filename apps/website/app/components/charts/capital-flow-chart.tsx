/**
 * 资金流向趋势图（主力净流入，柱状）
 */

import * as React from "react";
import type { EChartsOption } from "echarts";

import { useIsMobile } from "~/hooks/use-media-query";
import { ChartShell } from "~/components/charts/chart-shell";
import {
  makeBaseTextStyle,
  makeTooltip,
  upColor,
  downColor,
} from "~/components/charts/chart-utils";
import type { CapitalFlowTrendPoint } from "~/lib/stock-data";

interface CapitalFlowChartProps {
  data: CapitalFlowTrendPoint[];
  height?: number;
}

export function CapitalFlowChart({ data, height = 200 }: CapitalFlowChartProps) {
  const isMobile = useIsMobile();

  const option = React.useMemo<EChartsOption>(() => {
    const dates = data.map((d) => d.date.slice(5));
    const values = data.map((d) => d.mainNet);
    return {
      animation: data.length <= 120,
      aria: { enabled: true },
      color: [upColor],
      dataZoom: isMobile
        ? [{ type: "inside", filterMode: "none", minSpan: 8 }]
        : [
            { type: "inside", filterMode: "none", minSpan: 6 },
            {
              type: "slider",
              bottom: 0,
              height: 14,
              borderColor: "transparent",
              brushSelect: false,
              fillerColor: "rgba(255, 176, 0, 0.14)",
              handleSize: 12,
              showDetail: false,
            },
          ],
      grid: { bottom: isMobile ? 22 : 30, containLabel: true, left: 2, right: 6, top: 8 },
      textStyle: makeBaseTextStyle(),
      tooltip: {
        ...makeTooltip(),
        trigger: "axis",
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const item = arr[0] as { name?: string; value?: number } | undefined;
          if (!item) return "";
          const v = item.value ?? 0;
          const yi = v >= 1e8 ? `${(v / 1e8).toFixed(2)}亿` : `${(v / 1e4).toFixed(2)}万`;
          return `<div style="font-weight:600;margin-bottom:4px">${item.name}</div><div>主力净流入：${v >= 0 ? "+" : ""}${yi}</div>`;
        },
      },
      xAxis: {
        axisLabel: { hideOverlap: true },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
        boundaryGap: true,
        data: dates,
        type: "category",
      },
      yAxis: {
        axisLabel: {
          color: "var(--muted-foreground)",
          formatter: (v: number) =>
            Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(0)}亿` : `${(v / 1e4).toFixed(0)}万`,
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
        type: "value",
      },
      series: [
        {
          data: values.map((v) => ({
            value: v,
            itemStyle: { color: v >= 0 ? upColor : downColor },
          })),
          name: "主力净流入",
          type: "bar",
          barMaxWidth: 14,
        },
      ],
    } as EChartsOption;
  }, [data, isMobile]);

  return (
    <ChartShell
      empty={data.length < 2}
      emptyMessage="暂无资金流数据"
      height={height}
      option={option}
    />
  );
}
