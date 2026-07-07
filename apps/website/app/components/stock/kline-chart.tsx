/**
 * 统一行情图表：分时 / 日 K / 周 K / 月 K
 */

import * as React from "react";
import type { EChartsOption } from "echarts";

import { Button } from "~/components/ui/button";
import { useIsMobile } from "~/hooks/use-media-query";
import { ChartShell } from "~/components/charts/chart-shell";
import {
  downColor,
  getDataZoom,
  isFiniteNumber,
  makeBaseTextStyle,
  makeTooltip,
  neutralColor,
  upColor,
} from "~/components/charts/chart-utils";
import type { KLinePoint, MarketChartPeriod, MinutePoint, StockKLineMap } from "~/lib/stock-data";
import { formatMinuteTimeLabel } from "~/lib/stock-data";

interface KLineChartProps {
  dataByPeriod: StockKLineMap;
  defaultPeriod?: MarketChartPeriod;
  height?: number;
  minuteData?: MinutePoint[];
  prevClose?: number;
}

const PERIODS: Array<{ key: MarketChartPeriod; label: string }> = [
  { key: "minute", label: "分时" },
  { key: "1d", label: "日K" },
  { key: "1w", label: "周K" },
  { key: "1m", label: "月K" },
];

export function KLineChart({
  dataByPeriod,
  defaultPeriod = "minute",
  height = 360,
  minuteData = [],
  prevClose = 0,
}: KLineChartProps) {
  const isMobile = useIsMobile();
  const [period, setPeriod] = React.useState<MarketChartPeriod>(defaultPeriod);

  React.useEffect(() => {
    setPeriod(defaultPeriod);
  }, [defaultPeriod]);

  const klineData = period === "minute" ? [] : (dataByPeriod[period] ?? []);
  const cleanedKLine = React.useMemo(
    () => klineData.filter((d) => isFiniteNumber(d.close) && d.close > 0),
    [klineData],
  );
  const withMA = React.useMemo(() => {
    return cleanedKLine.map((d, i, arr) => ({
      ...d,
      ma5: average(arr, i, 5),
      ma10: average(arr, i, 10),
      ma20: average(arr, i, 20),
    }));
  }, [cleanedKLine]);

  const cleanedMinute = React.useMemo(
    () => minuteData.filter((d) => isFiniteNumber(d.price) && d.price > 0),
    [minuteData],
  );

  const empty = period === "minute" ? cleanedMinute.length < 2 : withMA.length < 2;
  const emptyMessage = period === "minute" ? "暂无分时数据" : "暂无 K 线数据";

  const option = React.useMemo<EChartsOption>(() => {
    if (period === "minute") {
      return makeMinuteOption(cleanedMinute, prevClose, isMobile);
    }
    return makeKLineOption(withMA, isMobile);
  }, [cleanedMinute, isMobile, period, prevClose, withMA]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            type="button"
            variant={period === p.key ? "default" : "secondary"}
            size="sm"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <ChartShell empty={empty} emptyMessage={emptyMessage} height={height} option={option} />
    </div>
  );
}

function makeMinuteOption(
  data: MinutePoint[],
  prevClose: number,
  isMobile: boolean,
): EChartsOption {
  const times = data.map((d) => formatMinuteTimeLabel(d.time));
  const prices = data.map((d) => d.price);
  const avgPrices = data.map((d) => d.avgPrice);
  const first = prevClose > 0 ? prevClose : (data[0]?.price ?? 0);
  const last = data[data.length - 1]?.price ?? first;
  const lineColor = last >= first ? upColor : downColor;

  return {
    animation: data.length <= 260,
    aria: { enabled: true },
    color: [lineColor, neutralColor],
    dataZoom: getDataZoom(isMobile),
    grid: { bottom: isMobile ? 22 : 34, containLabel: true, left: 4, right: 8, top: 12 },
    textStyle: makeBaseTextStyle(),
    tooltip: {
      ...makeTooltip(),
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params];
        const priceRow = arr.find((p) => (p as { seriesName?: string }).seriesName === "实时价");
        const avgRow = arr.find((p) => (p as { seriesName?: string }).seriesName === "均价");
        const time = (priceRow as { name?: string } | undefined)?.name ?? "";
        const price = (priceRow as { value?: number } | undefined)?.value;
        const avg = (avgRow as { value?: number } | undefined)?.value;
        return [
          `<div style="font-weight:600;margin-bottom:4px">${time}</div>`,
          `<div>价格：${formatPrice(price)}</div>`,
          `<div>均价：${formatPrice(avg)}</div>`,
        ].join("");
      },
    },
    xAxis: {
      axisLabel: { hideOverlap: true },
      axisLine: { lineStyle: { color: "var(--border)" } },
      axisTick: { show: false },
      boundaryGap: false,
      data: times,
      type: "category",
    },
    yAxis: {
      axisLabel: { color: "var(--muted-foreground)", formatter: (v: number) => v.toFixed(2) },
      axisLine: { show: false },
      scale: true,
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
      type: "value",
    },
    series: [
      {
        areaStyle: { color: `${lineColor}14` },
        data: prices,
        lineStyle: { color: lineColor, width: 1.5 },
        markLine:
          prevClose > 0
            ? {
                data: [{ yAxis: prevClose }],
                label: {
                  color: "var(--muted-foreground)",
                  fontSize: 10,
                  formatter: () => `昨收 ${prevClose.toFixed(2)}`,
                  position: "insideEndTop",
                },
                lineStyle: { color: "var(--muted-foreground)", type: "dashed", width: 1 },
                silent: true,
                symbol: "none",
              }
            : undefined,
        name: "实时价",
        showSymbol: false,
        smooth: false,
        type: "line",
      },
      {
        data: avgPrices,
        lineStyle: { color: neutralColor, type: "dashed", width: 1 },
        name: "均价",
        showSymbol: false,
        smooth: true,
        type: "line",
      },
    ],
  } as EChartsOption;
}

function makeKLineOption(
  data: Array<KLinePoint & { ma5: number | null; ma10: number | null; ma20: number | null }>,
  isMobile: boolean,
): EChartsOption {
  const dates = data.map((d) => d.date);
  const candles = data.map((d) => [d.open, d.close, d.low, d.high]);
  const ma5Data = data.map((d) => d.ma5);
  const ma10Data = data.map((d) => d.ma10);
  const ma20Data = data.map((d) => d.ma20);

  return {
    animation: data.length <= 200,
    aria: { enabled: true },
    dataZoom: getDataZoom(isMobile),
    grid: { bottom: isMobile ? 50 : 60, containLabel: true, left: 4, right: 8, top: 12 },
    legend: {
      bottom: isMobile ? 26 : 0,
      data: ["MA5", "MA10", "MA20"],
      textStyle: makeBaseTextStyle(),
    },
    textStyle: makeBaseTextStyle(),
    tooltip: {
      ...makeTooltip(),
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params];
        const candle = arr.find(
          (p) => (p as { seriesType?: string }).seriesType === "candlestick",
        ) as { data?: (string | number)[]; name?: string } | undefined;
        if (!candle?.data) return "";
        const [open, close, low, high] = candle.data as [number, number, number, number];
        const ma5Val = arr.find((p) => (p as { seriesName?: string }).seriesName === "MA5");
        const ma10Val = arr.find((p) => (p as { seriesName?: string }).seriesName === "MA10");
        const ma20Val = arr.find((p) => (p as { seriesName?: string }).seriesName === "MA20");
        return [
          `<div style="font-weight:600;margin-bottom:4px">${candle.name ?? ""}</div>`,
          `<div>开盘：${formatPrice(open)}</div>`,
          `<div>收盘：${formatPrice(close)}</div>`,
          `<div>最低：${formatPrice(low)}</div>`,
          `<div>最高：${formatPrice(high)}</div>`,
          `<div style="margin-top:4px">MA5：${formatPrice((ma5Val as { value?: number })?.value)}</div>`,
          `<div>MA10：${formatPrice((ma10Val as { value?: number })?.value)}</div>`,
          `<div>MA20：${formatPrice((ma20Val as { value?: number })?.value)}</div>`,
        ].join("");
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
      axisLabel: { color: "var(--muted-foreground)", formatter: (v: number) => v.toFixed(2) },
      axisLine: { show: false },
      scale: true,
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
      type: "value",
    },
    series: [
      {
        data: candles,
        emphasis: { focus: "series" },
        itemStyle: {
          borderColor: upColor,
          borderColor0: downColor,
          color: upColor,
          color0: downColor,
        },
        name: "K线",
        type: "candlestick",
      },
      {
        data: ma5Data,
        lineStyle: { color: "#f59e0b", width: 1 },
        name: "MA5",
        silent: true,
        smooth: true,
        symbol: "none",
        type: "line",
      },
      {
        data: ma10Data,
        lineStyle: { color: "#8b5cf6", width: 1 },
        name: "MA10",
        silent: true,
        smooth: true,
        symbol: "none",
        type: "line",
      },
      {
        data: ma20Data,
        lineStyle: { color: "#14b8a6", width: 1 },
        name: "MA20",
        silent: true,
        smooth: true,
        symbol: "none",
        type: "line",
      },
    ],
  } as EChartsOption;
}

function average(arr: KLinePoint[], end: number, window: number): number | null {
  if (end < window - 1) return null;
  let sum = 0;
  for (let i = end - window + 1; i <= end; i++) {
    sum += arr[i].close;
  }
  return sum / window;
}

function formatPrice(value: unknown): string {
  return isFiniteNumber(value as number) ? (value as number).toFixed(2) : "—";
}
