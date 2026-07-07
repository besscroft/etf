import { Gauge, LineChart, Trophy } from "lucide-react";
import type { ModuleKey, ModuleTheme } from "./types";

export const MODULE_THEMES: Record<ModuleKey, ModuleTheme> = {
  "fund-detail": {
    title: "基金详情",
    subtitle: "Fund Detail",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 / 东方财富",
    Icon: LineChart,
  },
  "fund-compare": {
    title: "基金对比",
    subtitle: "Fund Comparison",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 / 东方财富",
    Icon: Trophy,
  },
  analysis: {
    title: "基金深度分析",
    subtitle: "Fund Analysis",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 / 东方财富",
    Icon: Gauge,
  },
};

export function getModuleTheme(key: ModuleKey): ModuleTheme {
  return MODULE_THEMES[key];
}

export function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ICONS = { Gauge, LineChart, Trophy };
