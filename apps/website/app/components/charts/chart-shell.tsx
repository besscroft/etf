import * as React from "react";
import type { EChartsOption } from "echarts";

import { cn } from "~/lib/utils";
import { useECharts, type ChartEventMap } from "./use-echarts";

interface ChartShellProps {
  className?: string;
  empty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  events?: ChartEventMap;
  height?: number | string;
  loadingMessage?: string;
  option: EChartsOption;
}

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

export function ChartShell({
  className,
  empty,
  emptyMessage = "暂无可视化数据",
  errorMessage = "图表加载失败，已切换为降级展示",
  events,
  height = 280,
  loadingMessage = "图表加载中...",
  option,
}: ChartShellProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef);
  const { status } = useECharts({
    containerRef,
    enabled: inView && !empty,
    events,
    option,
  });

  const showOverlay = empty || status === "idle" || status === "loading" || status === "error";
  const message = empty ? emptyMessage : status === "error" ? errorMessage : loadingMessage;

  return (
    <div className={cn("relative w-full overflow-hidden", className)} style={{ height }}>
      <div ref={containerRef} className={cn("h-full w-full", empty && "hidden")} />
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60">
          <div className="rounded-none border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
            {message}
          </div>
        </div>
      )}
    </div>
  );
}
