import * as React from "react";
import type { EChartsOption } from "echarts";

import { useIsMobile } from "~/hooks/use-media-query";
import { ChartShell } from "./chart-shell";
import {
  chartPalette,
  formatNumber,
  formatPercent,
  getDataZoom,
  isFiniteNumber,
  makeBaseTextStyle,
  makeTooltip,
} from "./chart-utils";

interface ValuationTrendChartProps {
  data: Array<{
    actualNav: number | null;
    date: string;
    estimatedChange: number;
    estimatedNav: number;
  }>;
  height?: number;
}

export function ValuationTrendChart({ data, height = 220 }: ValuationTrendChartProps) {
  const isMobile = useIsMobile();
  const clean = React.useMemo(
    () =>
      data.filter(
        (item) => item.date && isFiniteNumber(item.estimatedNav) && item.estimatedNav > 0,
      ),
    [data],
  );
  const empty = clean.length < 2;

  const option = React.useMemo<EChartsOption>(
    () =>
      ({
        animation: clean.length <= 120,
        aria: { enabled: true },
        color: [chartPalette[0], chartPalette[2]],
        dataZoom: getDataZoom(isMobile),
        grid: { bottom: isMobile ? 22 : 34, containLabel: true, left: 4, right: 8, top: 34 },
        legend: {
          left: 0,
          textStyle: makeBaseTextStyle(),
          top: 0,
        },
        textStyle: makeBaseTextStyle(),
        tooltip: {
          ...makeTooltip(),
          formatter: (params: unknown) => {
            const rows = Array.isArray(params) ? params : [params];
            const title = (rows[0] as { axisValue?: string })?.axisValue ?? "";
            const source = clean.find((item) => item.date === title);
            return [
              `<div style="font-weight:600;margin-bottom:4px">${title}</div>`,
              ...rows.map((row) => {
                const item = row as {
                  marker?: string;
                  seriesName?: string;
                  value?: [string, number | null];
                };
                return `<div>${item.marker ?? ""}${item.seriesName ?? ""}：${formatNumber(item.value?.[1])}</div>`;
              }),
              `<div>估值涨跌：${formatPercent(source?.estimatedChange)}</div>`,
            ].join("");
          },
        },
        xAxis: {
          axisLabel: { hideOverlap: true },
          axisLine: { lineStyle: { color: "var(--border)" } },
          axisTick: { show: false },
          boundaryGap: false,
          type: "category",
        },
        yAxis: {
          axisLabel: { formatter: (value: number) => value.toFixed(4) },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
          type: "value",
          scale: true,
        },
        series: [
          {
            data: clean.map((item) => [item.date, item.estimatedNav]),
            lineStyle: { width: 2 },
            name: "估算净值",
            showSymbol: clean.length <= 90,
            smooth: true,
            type: "line",
          },
          {
            data: clean.map((item) => [item.date, item.actualNav]),
            lineStyle: { type: "dashed", width: 2 },
            name: "实际净值",
            showSymbol: clean.length <= 90,
            smooth: true,
            type: "line",
          },
        ],
      }) as EChartsOption,
    [clean, isMobile],
  );

  return <ChartShell empty={empty} height={height} option={option} />;
}
