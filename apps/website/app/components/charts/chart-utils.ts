import type { EChartsOption } from "echarts";

export const chartPalette = ["#ffb000", "#d14b43", "#168f68", "#7a6f5a", "#333333", "#9a9a9a"];
export const upColor = "#d14b43";
export const downColor = "#168f68";
export const neutralColor = "#6f6a60";

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
      fillerColor: "rgba(255, 176, 0, 0.14)",
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
      "'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, ui-sans-serif, system-ui, sans-serif",
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
    extraCssText: "box-shadow:0 12px 30px rgba(0,0,0,.12);border-radius:0;",
    textStyle: {
      color: "var(--popover-foreground)",
      fontSize: 12,
    },
    trigger: "axis" as const,
  };
}
