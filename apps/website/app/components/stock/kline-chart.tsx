import * as React from "react";
import type { EChartsOption } from "echarts";

import { Button } from "~/components/ui/button";
import { ChartShell, CHART_HEIGHTS } from "~/components/charts/chart-shell";
import { useIsMobile } from "~/hooks/use-media-query";
import {
  downColor,
  makeBaseTextStyle,
  makeTooltip,
  neutralColor,
  upColor,
} from "~/components/charts/chart-utils";
import type {
  KLinePeriod,
  KLinePoint,
  MarketChartPeriod,
  MinutePoint,
  StockKLineMap,
} from "~/lib/stock-data";
import { formatMinuteTimeLabel } from "~/lib/stock-data";

interface KLineChartProps {
  dataByPeriod: StockKLineMap;
  defaultPeriod?: MarketChartPeriod;
  height?: number | string;
  maWindowsByPeriod?: Partial<Record<KLinePeriod, number[]>>;
  minuteData?: MinutePoint[];
  prevClose?: number | null;
}

const PERIODS: Array<{ key: MarketChartPeriod; label: string }> = [
  { key: "minute", label: "分时" },
  { key: "1d", label: "日 K" },
  { key: "1w", label: "周 K" },
  { key: "1m", label: "月 K" },
];

const DEFAULT_MA_WINDOWS = [5, 10, 20];
const MA_COLORS = ["#f0b429", "#9d7cf5", "#31b89b", "#4d9de0", "#dd7aa8", "#7c8798"];

export function KLineChart({
  dataByPeriod,
  defaultPeriod = "minute",
  height = CHART_HEIGHTS.tall,
  maWindowsByPeriod,
  minuteData = [],
  prevClose = null,
}: KLineChartProps) {
  const isMobile = useIsMobile();
  const [period, setPeriod] = React.useState<MarketChartPeriod>(defaultPeriod);
  const swipeStart = React.useRef<{ x: number; y: number } | null>(null);
  const [swipeHint, setSwipeHint] = React.useState<string | null>(null);

  React.useEffect(() => setPeriod(defaultPeriod), [defaultPeriod]);

  const onTouchStart = (event: React.TouchEvent) => {
    if (!isMobile || event.touches.length !== 1) return;
    swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (swipeStart.current === null) return;
    const end = event.changedTouches[0];
    const deltaX = (end?.clientX ?? swipeStart.current.x) - swipeStart.current.x;
    const deltaY = (end?.clientY ?? swipeStart.current.y) - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    const index = PERIODS.findIndex((item) => item.key === period);
    const nextIndex = deltaX < 0 ? Math.min(PERIODS.length - 1, index + 1) : Math.max(0, index - 1);
    if (nextIndex === index) return;
    setPeriod(PERIODS[nextIndex].key);
    setSwipeHint(PERIODS[nextIndex].label);
    window.setTimeout(() => setSwipeHint(null), 500);
  };

  const rawKline = period === "minute" ? [] : (dataByPeriod[period] ?? []);
  const maWindows = React.useMemo(
    () =>
      period === "minute"
        ? DEFAULT_MA_WINDOWS
        : normalizeMAWindows(maWindowsByPeriod?.[period] ?? DEFAULT_MA_WINDOWS),
    [maWindowsByPeriod, period],
  );
  const cleanedKline = React.useMemo(() => rawKline.filter(isValidKLinePoint), [rawKline]);
  const withMA = React.useMemo(
    () =>
      cleanedKline.map((point, index, all) => ({
        ...point,
        ma: Object.fromEntries(
          maWindows.map((window) => [window, average(all, index, window)]),
        ) as Record<number, number | null>,
      })),
    [cleanedKline, maWindows],
  );
  const cleanedMinute = React.useMemo(
    () => minuteData.filter((point) => Number.isFinite(point.price) && point.price > 0),
    [minuteData],
  );
  const empty = period === "minute" ? cleanedMinute.length < 2 : withMA.length < 2;
  const option = React.useMemo<EChartsOption>(
    () =>
      period === "minute"
        ? makeMinuteOption(cleanedMinute, prevClose ?? 0, isMobile)
        : makeKLineOption(withMA, maWindows, isMobile),
    [cleanedMinute, isMobile, maWindows, period, prevClose, withMA],
  );

  return (
    <div className="space-y-3">
      <div className="market-segment w-fit">
        {PERIODS.map((item) => (
          <Button
            key={item.key}
            type="button"
            variant={period === item.key ? "default" : "ghost"}
            size="xs"
            onClick={() => setPeriod(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="relative touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <ChartShell
          empty={empty}
          emptyMessage={period === "minute" ? "暂无分时数据" : "暂无 K 线数据"}
          height={height}
          option={option}
          variant="tall"
        />
        {isMobile && swipeHint ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="border border-border bg-popover/95 px-3 py-1 text-sm font-medium shadow-xl">
              {swipeHint}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function makeMinuteOption(
  data: MinutePoint[],
  prevClose: number,
  isMobile: boolean,
): EChartsOption {
  const points: Array<{ label: string; price: number | null; avg: number | null; volume: number }> =
    [];
  let previousLabel = "";
  for (const point of data) {
    const label = formatMinuteTimeLabel(point.time);
    if (previousLabel === "11:30" && label >= "13:00")
      points.push({ label: "午休", price: null, avg: null, volume: 0 });
    points.push({
      label,
      price: point.price,
      avg: point.avgPrice > 0 ? point.avgPrice : null,
      volume: point.volume,
    });
    previousLabel = label;
  }
  const labels = points.map((point) => point.label);
  const prices = points.map((point) => point.price);
  const avgs = points.map((point) => point.avg);
  const volumes = points.map((point) => point.volume);
  const first = prices.find((value): value is number => value !== null) ?? prevClose;
  const last = [...prices].reverse().find((value): value is number => value !== null) ?? first;
  const lineColor = last >= first ? upColor : downColor;
  const validPrices = prices.filter((value): value is number => value !== null);
  const maxPrice = Math.max(...validPrices, prevClose, 1);
  const minPrice = Math.min(...validPrices, prevClose > 0 ? prevClose : maxPrice);
  const center = prevClose > 0 ? prevClose : (maxPrice + minPrice) / 2;
  const range =
    Math.max(...validPrices.map((value) => Math.abs(value - center)), center * 0.002, 0.02) * 1.08;
  const zoom = isMobile
    ? []
    : [
        { type: "inside", xAxisIndex: [0, 1], filterMode: "none", throttle: 50 },
        {
          type: "slider",
          xAxisIndex: [0, 1],
          bottom: 0,
          height: 16,
          showDetail: false,
          brushSelect: false,
        },
      ];
  return {
    animation: points.length <= 260,
    aria: { enabled: true },
    dataZoom: zoom,
    grid: [
      { left: 8, right: 12, top: 12, height: "66%", containLabel: true },
      { left: 8, right: 12, top: "80%", height: "13%", containLabel: true },
    ],
    textStyle: makeBaseTextStyle(),
    tooltip: { ...makeTooltip(), formatter: (params: unknown) => minuteTooltip(params) },
    xAxis: [
      {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
      },
      {
        type: "category",
        data: labels,
        gridIndex: 1,
        axisLabel: {
          hideOverlap: true,
          formatter: (value: string) => (value === "午休" ? "" : value),
        },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        type: "value",
        min: center - range,
        max: center + range,
        scale: true,
        axisLabel: {
          color: "var(--muted-foreground)",
          formatter: (value: number) => value.toFixed(2),
        },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.16)" } },
      },
      { type: "value", gridIndex: 1, show: false },
    ],
    series: [
      {
        type: "line",
        name: "实时价",
        data: prices,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { color: lineColor, width: 1.6 },
        areaStyle: { color: `${lineColor}18` },
        markLine:
          prevClose > 0
            ? {
                silent: true,
                symbol: "none",
                lineStyle: { color: "var(--muted-foreground)", type: "dashed" },
                label: {
                  color: "var(--muted-foreground)",
                  formatter: () => `昨收 ${prevClose.toFixed(2)}`,
                },
                data: [{ yAxis: prevClose }],
              }
            : undefined,
      },
      {
        type: "line",
        name: "均价",
        data: avgs,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { color: neutralColor, width: 1, type: "dashed" },
      },
      {
        type: "bar",
        name: "成交量",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        barMaxWidth: 6,
        itemStyle: { color: `${lineColor}80` },
      },
    ],
  } as EChartsOption;
}

function makeKLineOption(
  data: Array<KLinePoint & { ma: Record<number, number | null> }>,
  maWindows: number[],
  isMobile: boolean,
): EChartsOption {
  const dates = data.map((point) => point.date);
  const candles = data.map((point) => [point.open, point.close, point.low, point.high]);
  const volumes = data.map((point) => ({
    value: point.volume,
    itemStyle: { color: point.close >= point.open ? `${upColor}99` : `${downColor}99` },
  }));
  const maNames = maWindows.map((window) => `MA${window}`);
  const zoom = isMobile
    ? []
    : [
        { type: "inside", xAxisIndex: [0, 1], filterMode: "none", throttle: 50 },
        {
          type: "slider",
          xAxisIndex: [0, 1],
          bottom: 0,
          height: 16,
          showDetail: false,
          brushSelect: false,
        },
      ];
  return {
    animation: data.length <= 200,
    aria: { enabled: true },
    dataZoom: zoom,
    grid: [
      { left: 8, right: 12, top: 12, height: "64%", containLabel: true },
      { left: 8, right: 12, top: "78%", height: "15%", containLabel: true },
    ],
    legend: {
      bottom: isMobile ? 20 : 0,
      data: maNames,
      textStyle: makeBaseTextStyle(),
      type: "scroll",
    },
    textStyle: makeBaseTextStyle(),
    tooltip: { ...makeTooltip(), formatter: (params: unknown) => klineTooltip(params, maNames) },
    xAxis: [
      {
        type: "category",
        data: dates,
        boundaryGap: true,
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
      },
      {
        type: "category",
        data: dates,
        gridIndex: 1,
        boundaryGap: true,
        axisLabel: { hideOverlap: true },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        type: "value",
        scale: true,
        axisLabel: {
          color: "var(--muted-foreground)",
          formatter: (value: number) => value.toFixed(2),
        },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.16)" } },
      },
      { type: "value", gridIndex: 1, show: false },
    ],
    series: [
      {
        type: "candlestick",
        name: "K 线",
        data: candles,
        itemStyle: {
          borderColor: upColor,
          borderColor0: downColor,
          color: upColor,
          color0: downColor,
        },
      },
      ...maWindows.map((window, index) => ({
        type: "line",
        name: `MA${window}`,
        data: data.map((point) => point.ma[window]),
        showSymbol: false,
        smooth: false,
        symbol: "none",
        lineStyle: { color: MA_COLORS[index % MA_COLORS.length], width: 1.1 },
      })),
      { type: "bar", name: "成交量", xAxisIndex: 1, yAxisIndex: 1, data: volumes, barMaxWidth: 7 },
    ],
  } as EChartsOption;
}

function minuteTooltip(params: unknown) {
  const rows = Array.isArray(params) ? params : [params];
  const first = rows[0] as { name?: string; value?: number } | undefined;
  const second = rows[1] as { value?: number } | undefined;
  return `<div style="font-weight:600;margin-bottom:4px">${first?.name ?? ""}</div><div>价格：${formatValue(first?.value)}</div><div>均价：${formatValue(second?.value)}</div>`;
}

function klineTooltip(params: unknown, maNames: string[]) {
  const rows = Array.isArray(params) ? params : [params];
  const candle = rows.find(
    (row) => (row as { seriesType?: string }).seriesType === "candlestick",
  ) as { name?: string; data?: number[] } | undefined;
  if (!candle?.data) return "";
  const [open, close, low, high] = candle.data;
  const volume = rows.find((row) => (row as { seriesName?: string }).seriesName === "成交量") as
    | { value?: number }
    | undefined;
  const ma = maNames
    .map((name) => {
      const row = rows.find((item) => (item as { seriesName?: string }).seriesName === name) as
        | { value?: number }
        | undefined;
      return `<div>${name}：${formatValue(row?.value)}</div>`;
    })
    .join("");
  return `<div style="font-weight:600;margin-bottom:4px">${candle.name ?? ""}</div><div>开盘：${formatValue(open)}</div><div>收盘：${formatValue(close)}</div><div>最低：${formatValue(low)}</div><div>最高：${formatValue(high)}</div><div>成交量：${volume?.value ? Math.round(volume.value).toLocaleString("zh-CN") : "—"}</div><div style="margin-top:4px">${ma}</div>`;
}

function formatValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";
}

function isValidKLinePoint(point: KLinePoint) {
  return (
    point.high > 0 &&
    point.low > 0 &&
    point.low <= point.open &&
    point.low <= point.close &&
    point.high >= point.open &&
    point.high >= point.close
  );
}

function normalizeMAWindows(windows: number[]) {
  const result = Array.from(
    new Set(
      windows
        .map((window) => Math.floor(window))
        .filter((window) => Number.isFinite(window) && window > 0),
    ),
  );
  return result.length > 0 ? result : DEFAULT_MA_WINDOWS;
}

function average(data: KLinePoint[], end: number, window: number): number | null {
  if (end < window - 1) return null;
  let sum = 0;
  for (let index = end - window + 1; index <= end; index += 1) sum += data[index].close;
  return sum / window;
}
