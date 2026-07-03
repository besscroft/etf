import * as React from "react";
import type { ECElementEvent, ECharts, EChartsOption, SetOptionOpts } from "echarts";

import { loadECharts } from "./echarts-loader";

type ChartStatus = "idle" | "loading" | "ready" | "error";
type ChartEventName = "click" | "dblclick" | "mouseover" | "mouseout" | "legendselectchanged";
type ChartEventHandler = (event: ECElementEvent) => void;
type ChartEventMap = Partial<Record<ChartEventName, ChartEventHandler>>;

interface UseEChartsOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  events?: ChartEventMap;
  option: EChartsOption;
  setOption?: SetOptionOpts;
  theme?: string;
}

export function useECharts({
  containerRef,
  enabled,
  events,
  option,
  setOption,
  theme,
}: UseEChartsOptions) {
  const chartRef = React.useRef<ECharts | null>(null);
  const eventsRef = React.useRef(events);
  const optionRef = React.useRef(option);
  const [status, setStatus] = React.useState<ChartStatus>("idle");
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  React.useEffect(() => {
    optionRef.current = option;
    const chart = chartRef.current;
    if (!chart || status !== "ready") return;

    chart.setOption(option, {
      lazyUpdate: true,
      notMerge: true,
      ...setOption,
    });
  }, [option, setOption, status]);

  React.useEffect(() => {
    if (!enabled || !containerRef.current) {
      if (!enabled) setStatus("idle");
      return;
    }

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const handlers: Array<[ChartEventName, ChartEventHandler]> = [];

    setStatus("loading");
    setError(null);

    loadECharts()
      .then((echarts) => {
        if (cancelled || !containerRef.current) return;

        const chart = echarts.init(containerRef.current, theme, { renderer: "canvas" });
        chartRef.current = chart;
        chart.setOption(optionRef.current, {
          lazyUpdate: true,
          notMerge: true,
          ...setOption,
        });

        const eventNames = Object.keys(eventsRef.current ?? {}) as ChartEventName[];
        for (const eventName of eventNames) {
          const handler = (event: ECElementEvent) => {
            eventsRef.current?.[eventName]?.(event);
          };
          handlers.push([eventName, handler]);
          chart.on(eventName, handler as never);
        }

        resizeObserver = new ResizeObserver(() => {
          chart.resize();
        });
        resizeObserver.observe(containerRef.current);
        requestAnimationFrame(() => chart.resize());

        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason : new Error("Chart failed to load"));
        setStatus("error");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      const chart = chartRef.current;
      if (chart) {
        for (const [eventName, handler] of handlers) {
          chart.off(eventName, handler as never);
        }
        chart.dispose();
      }
      chartRef.current = null;
    };
  }, [containerRef, enabled, setOption, theme]);

  return { error, status };
}

export type { ChartEventMap };
