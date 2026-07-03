import type { EChartsOption } from "echarts";

export const chartPalette = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];
export const upColor = "#ef4444";
export const downColor = "#10b981";
export const neutralColor = "#64748b";

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatPercent(value: number | null | undefined, digits = 2) {
  if (!isFiniteNumber(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 4) {
  if (!isFiniteNumber(value)) return "--";
  return value.toFixed(digits);
}

export function sampleByLimit<T>(items: T[], limit: number) {
  if (items.length <= limit) return items;
  const step = Math.ceil(items.length / limit);
  return items.filter(
    (_, index) => index === 0 || index === items.length - 1 || index % step === 0,
  );
}

export function getDataZoom(isMobile: boolean): EChartsOption["dataZoom"] {
  const inside = {
    type: "inside" as const,
    filterMode: "none" as const,
    minSpan: 3,
    throttle: 50,
  };

  if (isMobile) return [inside];

  return [
    inside,
    {
      type: "slider" as const,
      bottom: 0,
      height: 18,
      borderColor: "transparent",
      brushSelect: false,
      fillerColor: "rgba(37, 99, 235, 0.12)",
      handleSize: 12,
      moveHandleSize: 4,
      showDetail: false,
      throttle: 50,
    },
  ];
}

export function makeBaseTextStyle() {
  return {
    color: "var(--muted-foreground)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 11,
  };
}

export function makeTooltip() {
  return {
    appendToBody: true,
    backgroundColor: "var(--popover)",
    borderColor: "var(--border)",
    borderWidth: 1,
    confine: true,
    extraCssText: "box-shadow:0 12px 30px rgba(15,23,42,.12);border-radius:0;",
    textStyle: {
      color: "var(--popover-foreground)",
      fontSize: 12,
    },
    trigger: "axis" as const,
  };
}
