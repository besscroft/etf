/**
 * 股票 K线图（2026-07-03 新增）
 *
 * - 复用 use-echarts + ChartShell（与 fund-nav-trend-chart 同模式）
 * - series: candlestick (OHLC) + line (MA5/MA10/MA20 均线)
 * - 周期切换：日 K / 周 K / 月 K
 * - 涨跌色：复用 chart-utils 的 upColor（红涨）/ downColor（绿跌）
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
  upColor,
} from "~/components/charts/chart-utils";
import type { KLinePeriod, KLinePoint, StockKLineMap } from "~/lib/stock-data";

interface KLineChartProps {
  dataByPeriod: StockKLineMap;
  defaultPeriod?: KLinePeriod;
  height?: number;
}

const PERIODS: Array<{ key: KLinePeriod; label: string }> = [
  { key: "1d", label: "日K" },
  { key: "1w", label: "周K" },
  { key: "1m", label: "月K" },
];

export function KLineChart({ dataByPeriod, defaultPeriod = "1d", height = 360 }: KLineChartProps) {
  const isMobile = useIsMobile();
  const [period, setPeriod] = React.useState<KLinePeriod>(defaultPeriod);

  React.useEffect(() => {
    setPeriod(defaultPeriod);
  }, [defaultPeriod]);

  const data = dataByPeriod[period] ?? [];

  // 清洗 + 计算 MA
  const cleaned = React.useMemo(
    () => data.filter((d) => isFiniteNumber(d.close) && d.close > 0),
    [data],
  );
  const withMA = React.useMemo(() => {
    return cleaned.map((d, i, arr) => {
      const ma5 = average(arr, i, 5);
      const ma10 = average(arr, i, 10);
      const ma20 = average(arr, i, 20);
      return { ...d, ma5, ma10, ma20 };
    });
  }, [cleaned]);

  const empty = withMA.length < 2;

  const option = React.useMemo<EChartsOption>(() => {
    const dates = withMA.map((d) => d.date);
    // candlestick 数据格式：[open, close, low, high]
    const candles = withMA.map((d) => [d.open, d.close, d.low, d.high]);
    const ma5Data = withMA.map((d) => d.ma5);
    const ma10Data = withMA.map((d) => d.ma10);
    const ma20Data = withMA.map((d) => d.ma20);

    return {
      animation: withMA.length <= 200,
      aria: { enabled: true },
      textStyle: makeBaseTextStyle(),
      tooltip: {
        ...makeTooltip(),
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const candle = arr.find(
            (p) => (p as { seriesType?: string }).seriesType === "candlestick",
          ) as { data?: (string | number)[]; name?: string } | undefined;
          if (!candle || !candle.data) return "";
          const date = candle.name ?? "";
          const [open, close, low, high] = candle.data as [number, number, number, number];
          const ma5Val = arr.find((p) => (p as { seriesName?: string }).seriesName === "MA5");
          const ma10Val = arr.find((p) => (p as { seriesName?: string }).seriesName === "MA10");
          const ma20Val = arr.find((p) => (p as { seriesName?: string }).seriesName === "MA20");
          const fmt = (v: unknown) =>
            isFiniteNumber(v as number) ? (v as number).toFixed(2) : "—";
          return [
            `<div style="font-weight:600;margin-bottom:4px">${date}</div>`,
            `<div>开盘：${fmt(open)}</div>`,
            `<div>收盘：${fmt(close)}</div>`,
            `<div>最低：${fmt(low)}</div>`,
            `<div>最高：${fmt(high)}</div>`,
            `<div style="margin-top:4px">MA5：${fmt((ma5Val as { value?: number })?.value)}</div>`,
            `<div>MA10：${fmt((ma10Val as { value?: number })?.value)}</div>`,
            `<div>MA20：${fmt((ma20Val as { value?: number })?.value)}</div>`,
          ].join("");
        },
      },
      legend: {
        bottom: isMobile ? 26 : 0,
        data: ["MA5", "MA10", "MA20"],
        textStyle: makeBaseTextStyle(),
      },
      grid: {
        bottom: isMobile ? 50 : 60,
        containLabel: true,
        left: 4,
        right: 8,
        top: 12,
      },
      dataZoom: getDataZoom(isMobile),
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { hideOverlap: true },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
        boundaryGap: true,
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          formatter: (v: number) => v.toFixed(2),
          color: "var(--muted-foreground)",
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
      },
      series: [
        {
          type: "candlestick",
          name: "K线",
          data: candles,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor,
          },
          emphasis: { focus: "series" },
        },
        {
          type: "line",
          name: "MA5",
          data: ma5Data,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#f59e0b", width: 1 },
          silent: true,
        },
        {
          type: "line",
          name: "MA10",
          data: ma10Data,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#8b5cf6", width: 1 },
          silent: true,
        },
        {
          type: "line",
          name: "MA20",
          data: ma20Data,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#14b8a6", width: 1 },
          silent: true,
        },
      ],
    } as EChartsOption;
  }, [withMA, isMobile]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
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
      <ChartShell empty={empty} emptyMessage="暂无 K 线数据" height={height} option={option} />
    </div>
  );
}

function average(arr: KLinePoint[], end: number, window: number): number | null {
  if (end < window - 1) return null;
  let sum = 0;
  for (let i = end - window + 1; i <= end; i++) {
    sum += arr[i].close;
  }
  return sum / window;
}
