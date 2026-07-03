/**
 * 股票分时走势图（2026-07-03 新增）
 *
 * - 实线：实时价
 * - 虚线：当日均价
 * - markLine：昨收价参考线
 * - 休市时（24h 外）仍展示最近一个交易日的数据
 */

import * as React from "react";
import type { EChartsOption } from "echarts";

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
import { useIsMobile } from "~/hooks/use-media-query";
import type { MinutePoint } from "~/lib/stock-data";

interface MinuteChartProps {
  data: MinutePoint[];
  /** 昨收价（用于 markLine 参考线） */
  prevClose?: number;
  height?: number;
}

export function MinuteChart({ data, prevClose = 0, height = 280 }: MinuteChartProps) {
  const isMobile = useIsMobile();

  const cleaned = React.useMemo(
    () => data.filter((d) => isFiniteNumber(d.price) && d.price > 0),
    [data],
  );
  const empty = cleaned.length < 2;

  const isTrading = isInTradingHours();

  const option = React.useMemo<EChartsOption>(() => {
    const times = cleaned.map((d) => d.time.slice(8, 12)); // HH:MM
    const prices = cleaned.map((d) => d.price);
    const avgPrices = cleaned.map((d) => d.avgPrice);

    // 用首点价确定色（涨/跌）
    const first = cleaned[0]?.price ?? 0;
    const last = cleaned[cleaned.length - 1]?.price ?? first;
    const lineColor = last >= first ? upColor : downColor;

    return {
      animation: cleaned.length <= 240,
      aria: { enabled: true },
      color: [lineColor, neutralColor],
      textStyle: makeBaseTextStyle(),
      tooltip: {
        ...makeTooltip(),
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p0 = arr[0] as { name?: string; data?: (string | number)[] };
          const p1 = arr[1] as { data?: (string | number)[] };
          const time = p0?.name ?? "";
          const price = (p0?.data as number[] | undefined)?.[0] ?? 0;
          const avg = (p1?.data as number[] | undefined)?.[0] ?? 0;
          return [
            `<div style="font-weight:600;margin-bottom:4px">${time}</div>`,
            `<div>价格：${price.toFixed(2)}</div>`,
            `<div>均价：${avg.toFixed(2)}</div>`,
          ].join("");
        },
      },
      grid: {
        bottom: isMobile ? 22 : 34,
        containLabel: true,
        left: 4,
        right: 8,
        top: 12,
      },
      dataZoom: getDataZoom(isMobile),
      xAxis: {
        type: "category",
        data: times,
        axisLabel: {
          hideOverlap: true,
          formatter: (v: string) =>
            typeof v === "string" && v.length === 4 ? `${v.slice(0, 2)}:${v.slice(2)}` : v,
        },
        axisLine: { lineStyle: { color: "var(--border)" } },
        axisTick: { show: false },
        boundaryGap: false,
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
          type: "line",
          name: "实时价",
          data: prices,
          showSymbol: false,
          smooth: false,
          lineStyle: { color: lineColor, width: 1.5 },
          areaStyle: { color: `${lineColor}14` },
          markLine:
            prevClose > 0
              ? {
                  silent: true,
                  symbol: "none",
                  label: {
                    color: "var(--muted-foreground)",
                    fontSize: 10,
                    formatter: () => `昨收 ${prevClose.toFixed(2)}`,
                    position: "insideEndTop",
                  },
                  lineStyle: { color: "var(--muted-foreground)", type: "dashed", width: 1 },
                  data: [{ yAxis: prevClose }],
                }
              : undefined,
        },
        {
          type: "line",
          name: "均价",
          data: avgPrices,
          showSymbol: false,
          smooth: true,
          lineStyle: { color: neutralColor, width: 1, type: "dashed" },
        },
      ],
    } as EChartsOption;
  }, [cleaned, prevClose, isMobile]);

  return (
    <div className="space-y-2">
      {!isTrading && (
        <div className="rounded-md bg-muted/60 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
          当前为非交易时段，展示最近一个交易日分时
        </div>
      )}
      <ChartShell empty={empty} emptyMessage="暂无分时数据" height={height} option={option} />
    </div>
  );
}

/** 简单判断 A 股交易时段：周一至周五 9:30-11:30 / 13:00-15:00 */
function isInTradingHours(): boolean {
  if (typeof Date === "undefined") return false;
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (
    (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) ||
    (minutes >= 13 * 60 && minutes <= 15 * 60)
  );
}
