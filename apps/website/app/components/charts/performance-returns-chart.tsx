import * as React from "react";
import type { ECElementEvent, EChartsOption } from "echarts";
import { useNavigate } from "react-router";

import type { FundDetailData } from "~/lib/market-data";
import { useIsMobile } from "~/hooks/use-media-query";
import { ChartShell } from "./chart-shell";
import {
  chartPalette,
  downColor,
  formatPercent,
  makeBaseTextStyle,
  makeTooltip,
  upColor,
} from "./chart-utils";

const PERIODS: Array<{ key: keyof FundDetailData["performance"]; label: string }> = [
  { key: "oneMonth", label: "近1月" },
  { key: "threeMonth", label: "近3月" },
  { key: "sixMonth", label: "近6月" },
  { key: "oneYear", label: "近1年" },
];

interface PerformanceReturnsChartProps {
  detailHref?: (code: string) => string;
  funds: Array<FundDetailData & { error?: string }>;
  height?: number;
}

export function PerformanceReturnsChart({
  detailHref = (code) => `/otc-fund?code=${code}`,
  funds,
  height = 300,
}: PerformanceReturnsChartProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const validFunds = React.useMemo(() => funds.filter((fund) => !fund.error), [funds]);
  const empty = validFunds.length === 0;

  const option = React.useMemo<EChartsOption>(
    () =>
      ({
        animation: validFunds.length * PERIODS.length <= 32,
        aria: { enabled: true },
        color: chartPalette,
        grid: { bottom: isMobile ? 48 : 24, containLabel: true, left: 4, right: 8, top: 36 },
        legend: {
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
                const item = row as { marker?: string; seriesName?: string; value?: number };
                return `<div>${item.marker ?? ""}${item.seriesName ?? ""}：${formatPercent(item.value)}</div>`;
              }),
            ].join("");
          },
        },
        xAxis: {
          axisLine: { lineStyle: { color: "var(--border)" } },
          axisTick: { show: false },
          data: PERIODS.map((period) => period.label),
          type: "category",
        },
        yAxis: {
          axisLabel: { formatter: (value: number) => `${value}%` },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
          type: "value",
        },
        series: validFunds.map((fund, index) => ({
          data: PERIODS.map((period) => {
            const value = fund.performance[period.key];
            return {
              code: fund.code,
              itemStyle: { color: value === null || value >= 0 ? upColor : downColor },
              value,
            };
          }),
          name: fund.name,
          type: "bar",
          universalTransition: true,
          barMaxWidth: 28,
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          emphasis: { focus: "series" },
          color: chartPalette[index % chartPalette.length],
        })),
      }) as EChartsOption,
    [isMobile, validFunds],
  );

  const events = React.useMemo(
    () => ({
      click: (event: ECElementEvent) => {
        const code = (event.data as { code?: string } | undefined)?.code;
        if (code) void navigate(detailHref(code));
      },
    }),
    [detailHref, navigate],
  );

  return <ChartShell empty={empty} events={events} height={height} option={option} />;
}
