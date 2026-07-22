import * as React from "react";
import type { ECElementEvent, EChartsOption } from "echarts";
import { useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import type { FundDetailData } from "~/lib/market-data";
import { useIsMobile } from "~/hooks/use-media-query";
import { ChartShell, CHART_HEIGHTS } from "./chart-shell";
import {
  chartPalette,
  downColor,
  formatPercent,
  getDataZoom,
  isFiniteNumber,
  makeBaseTextStyle,
  makeTooltip,
  sampleByLimit,
  upColor,
} from "./chart-utils";

type RangeKey = "3m" | "6m" | "1y" | "all";
type ChartMode = "line" | "bar";

interface CompareSeries {
  code: string;
  color: string;
  name: string;
  points: Array<{ date: string; value: number }>;
  rangeReturn: number;
}

const RANGES: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "3m", label: "近3月", days: 90 },
  { key: "6m", label: "近6月", days: 180 },
  { key: "1y", label: "近1年", days: 365 },
  { key: "all", label: "全部", days: Number.POSITIVE_INFINITY },
];

interface FundCompareChartProps {
  defaultRange?: RangeKey;
  detailHref?: (code: string) => string;
  funds: Array<FundDetailData & { error?: string }>;
  height?: number | string;
  initialMode?: ChartMode;
  showRangeControls?: boolean;
}

export function FundCompareChart({
  defaultRange = "1y",
  detailHref = (code) => `/otc-fund?code=${code}`,
  funds,
  height = CHART_HEIGHTS.standard,
  initialMode = "line",
  showRangeControls = true,
}: FundCompareChartProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [range, setRange] = React.useState<RangeKey>(defaultRange);
  const [mode, setMode] = React.useState<ChartMode>(initialMode);

  React.useEffect(() => setRange(defaultRange), [defaultRange]);
  React.useEffect(() => setMode(initialMode), [initialMode]);

  const seriesData = React.useMemo<CompareSeries[]>(() => {
    const days = RANGES.find((item) => item.key === range)?.days ?? 365;
    return funds
      .filter((fund) => !fund.error && fund.navTrend?.length >= 2)
      .map((fund, fundIndex) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        const filtered =
          days === Number.POSITIVE_INFINITY
            ? fund.navTrend
            : fund.navTrend.filter((item) => item.date >= cutoffStr);
        const clean = filtered.filter(
          (item) => item.date && isFiniteNumber(item.nav) && item.nav > 0,
        );
        if (clean.length < 2) return null;
        const base = clean[0].nav;
        const points = clean.map((item) => ({
          date: item.date,
          value: base > 0 ? (item.nav / base) * 100 : 100,
        }));
        const sampled = sampleByLimit(points, isMobile ? 180 : 600);
        const latest = points[points.length - 1]?.value ?? 100;

        return {
          code: fund.code,
          color: chartPalette[fundIndex % chartPalette.length],
          name: fund.name,
          points: sampled,
          rangeReturn: latest - 100,
        };
      })
      .filter((series): series is CompareSeries => series !== null);
  }, [funds, isMobile, range]);

  const empty = seriesData.length === 0;

  const option = React.useMemo<EChartsOption>(() => {
    if (mode === "bar") {
      return {
        animation: seriesData.length <= 8,
        aria: { enabled: true },
        color: seriesData.map((series) => series.color),
        grid: { bottom: 18, containLabel: true, left: 4, right: 8, top: 18 },
        textStyle: makeBaseTextStyle(),
        tooltip: {
          ...makeTooltip(),
          trigger: "item",
          formatter: (params: unknown) => {
            const item = params as { name?: string; value?: number };
            return `<div style="font-weight:600;margin-bottom:4px">${item.name ?? ""}</div><div>区间收益：${formatPercent(item.value)}</div>`;
          },
        },
        xAxis: {
          axisLabel: { interval: 0, overflow: "truncate", width: isMobile ? 64 : 96 },
          axisLine: { lineStyle: { color: "var(--border)" } },
          axisTick: { show: false },
          data: seriesData.map((series) => series.name),
          type: "category",
        },
        yAxis: {
          axisLabel: { formatter: (value: number) => `${value}%` },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
          type: "value",
        },
        series: [
          {
            data: seriesData.map((series) => ({
              code: series.code,
              itemStyle: { color: series.rangeReturn >= 0 ? upColor : downColor },
              name: series.name,
              value: Number(series.rangeReturn.toFixed(2)),
            })),
            label: {
              formatter: ({ value }: { value: number }) => formatPercent(value),
              position: "top",
              show: !isMobile,
            },
            name: "区间收益",
            type: "bar",
            universalTransition: true,
          },
        ],
      } as EChartsOption;
    }

    return {
      animation: seriesData.reduce((sum, series) => sum + series.points.length, 0) <= 900,
      aria: { enabled: true },
      color: seriesData.map((series) => series.color),
      dataZoom: getDataZoom(isMobile),
      grid: { bottom: isMobile ? 22 : 34, containLabel: true, left: 4, right: 8, top: 34 },
      legend: {
        bottom: isMobile ? undefined : "auto",
        left: 0,
        textStyle: makeBaseTextStyle(),
        top: 0,
        type: "scroll",
      },
      textStyle: makeBaseTextStyle(),
      tooltip: {
        ...makeTooltip(),
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [params];
          const title = (rows[0] as { axisValue?: string })?.axisValue ?? "";
          return [
            `<div style="font-weight:600;margin-bottom:4px">${title}</div>`,
            ...rows.map((row) => {
              const item = row as {
                marker?: string;
                seriesName?: string;
                value?: [string, number];
              };
              const value = item.value?.[1];
              return `<div>${item.marker ?? ""}${item.seriesName ?? ""}：${formatPercent(isFiniteNumber(value) ? value - 100 : null)}</div>`;
            }),
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
        axisLabel: { formatter: (value: number) => `${value.toFixed(0)}` },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
        type: "value",
        scale: true,
      },
      series: seriesData.map((series) => ({
        data: series.points.map((point) => [point.date, point.value]),
        emphasis: { focus: "series" },
        large: series.points.length > 1000,
        lineStyle: { width: 2 },
        name: series.name,
        progressive: 600,
        sampling: "lttb",
        showSymbol: series.points.length <= 80,
        smooth: series.points.length <= 220,
        type: "line",
        universalTransition: true,
      })),
    } as EChartsOption;
  }, [isMobile, mode, seriesData]);

  const events = React.useMemo(
    () => ({
      click: (event: ECElementEvent) => {
        const seriesIndex = event.seriesIndex ?? 0;
        const code =
          mode === "bar"
            ? (event.data as { code?: string } | undefined)?.code
            : seriesData[seriesIndex]?.code;
        if (code) void navigate(detailHref(code));
      },
    }),
    [detailHref, mode, navigate, seriesData],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showRangeControls ? (
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={range === item.key ? "default" : "secondary"}
                size="sm"
                onClick={() => setRange(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">点击图例筛选，滚轮或双指缩放</span>
        )}
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant={mode === "line" ? "default" : "secondary"}
            size="sm"
            onClick={() => setMode("line")}
          >
            趋势
          </Button>
          <Button
            type="button"
            variant={mode === "bar" ? "default" : "secondary"}
            size="sm"
            onClick={() => setMode("bar")}
          >
            收益
          </Button>
        </div>
      </div>
      <ChartShell empty={empty} events={events} height={height} option={option} />
    </div>
  );
}
