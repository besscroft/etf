import * as React from "react";
import type { EChartsOption } from "echarts";

import { Button } from "~/components/ui/button";
import { useIsMobile } from "~/hooks/use-media-query";
import { ChartShell } from "./chart-shell";
import {
  downColor,
  formatNumber,
  formatPercent,
  getDataZoom,
  isFiniteNumber,
  makeBaseTextStyle,
  makeTooltip,
  sampleByLimit,
  upColor,
} from "./chart-utils";

type RangeKey = "1m" | "3m" | "6m" | "1y" | "3y" | "all";

const RANGES: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "1m", label: "近1月", days: 30 },
  { key: "3m", label: "近3月", days: 90 },
  { key: "6m", label: "近6月", days: 180 },
  { key: "1y", label: "近1年", days: 365 },
  { key: "3y", label: "近3年", days: 1095 },
  { key: "all", label: "成立以来", days: Number.POSITIVE_INFINITY },
];

interface FundNavTrendChartProps {
  data: Array<{ date: string; nav: number; dailyReturn?: number }>;
  defaultRange?: RangeKey;
  height?: number;
  showRangeControls?: boolean;
}

export function FundNavTrendChart({
  data,
  defaultRange = "1y",
  height = 280,
  showRangeControls = true,
}: FundNavTrendChartProps) {
  const isMobile = useIsMobile();
  const [range, setRange] = React.useState<RangeKey>(defaultRange);

  React.useEffect(() => {
    setRange(defaultRange);
  }, [defaultRange]);

  const filtered = React.useMemo(() => {
    const clean = data.filter((item) => item.date && isFiniteNumber(item.nav) && item.nav > 0);
    const rangeConfig = RANGES.find((item) => item.key === range);
    if (!rangeConfig || rangeConfig.days === Number.POSITIVE_INFINITY) return clean;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeConfig.days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return clean.filter((item) => item.date >= cutoffStr);
  }, [data, range]);

  const sampled = React.useMemo(
    () => sampleByLimit(filtered, isMobile ? 180 : 800),
    [filtered, isMobile],
  );
  const empty = sampled.length < 2;

  const option = React.useMemo<EChartsOption>(() => {
    const first = sampled[0]?.nav ?? 0;
    const last = sampled[sampled.length - 1]?.nav ?? first;
    const lineColor = last >= first ? upColor : downColor;

    return {
      animation: sampled.length <= 400,
      aria: { enabled: true },
      color: [lineColor],
      dataZoom: getDataZoom(isMobile),
      grid: {
        bottom: isMobile ? 22 : 34,
        containLabel: true,
        left: 4,
        right: 8,
        top: 12,
      },
      textStyle: makeBaseTextStyle(),
      tooltip: {
        ...makeTooltip(),
        formatter: (params: unknown) => {
          const point = Array.isArray(params) ? params[0] : params;
          const value = (point as { value?: [string, number, number | null] })?.value;
          const date = value?.[0] ?? "";
          const nav = value?.[1];
          const dailyReturn = value?.[2];
          const rangeReturn =
            first > 0 && isFiniteNumber(nav) ? ((nav - first) / first) * 100 : null;
          return [
            `<div style="font-weight:600;margin-bottom:4px">${date}</div>`,
            `<div>净值：${formatNumber(nav)}</div>`,
            `<div>日涨跌：${formatPercent(dailyReturn)}</div>`,
            `<div>区间：${formatPercent(rangeReturn)}</div>`,
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
        axisLabel: { formatter: (value: number) => value.toFixed(2) },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
        type: "value",
        scale: true,
      },
      series: [
        {
          areaStyle: { color: `${lineColor}1a` },
          data: sampled.map((item) => [item.date, item.nav, item.dailyReturn ?? null]),
          emphasis: { focus: "series" },
          large: sampled.length > 1000,
          lineStyle: { color: lineColor, width: 2 },
          name: "单位净值",
          progressive: 600,
          sampling: "lttb",
          showSymbol: sampled.length <= 120,
          smooth: sampled.length <= 260,
          symbolSize: 5,
          type: "line",
        },
      ],
    } as EChartsOption;
  }, [isMobile, sampled]);

  return (
    <div className="space-y-3">
      {showRangeControls && (
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RANGES.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={range === item.key ? "default" : "secondary"}
              size="sm"
              className="shrink-0"
              onClick={() => setRange(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      <ChartShell empty={empty} height={height} option={option} />
    </div>
  );
}
