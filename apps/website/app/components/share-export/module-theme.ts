/**
 * 各功能模块导出主题配置
 *
 * 导出图片统一使用 ETFVoid 国内金融产品主题。
 */
import { BarChart3, Shield, Activity, LineChart, Trophy, Users, Gauge } from "lucide-react";
import type { ModuleKey, ModuleTheme } from "./types";

export const MODULE_THEMES: Record<ModuleKey, ModuleTheme> = {
  nasdaq: {
    title: "场内 ETF 观察",
    subtitle: "Exchange-traded funds",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  sp500: {
    title: "场内 ETF 观察",
    subtitle: "Exchange-traded funds",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  active: {
    title: "场外基金观察",
    subtitle: "Mutual fund watch",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  qdii: {
    title: "场外基金一览",
    subtitle: "Mutual fund list",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  valuation: {
    title: "基金估值观察",
    subtitle: "Valuation watch",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "天天基金网 · 估值仅供参考",
    Icon: Activity,
  },
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
  stable: {
    title: "稳健资产观察",
    subtitle: "Stable Yield Products",
    primary: "#ffb000",
    gradientEnd: "#141414",
    accent: "#d28a00",
    source: "公开数据整理",
    Icon: Shield,
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

/** 工具方法：按 ModuleKey 取主题 */
export function getModuleTheme(key: ModuleKey): ModuleTheme {
  return MODULE_THEMES[key];
}

/** 工具方法：把 hex 颜色转为带透明度的 rgba 字符串 */
export function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 图标复用占位（保持 import 不被 tree-shake，避免类型断言） */
export const ICONS = { BarChart3, Shield, Activity, LineChart, Trophy, Users, Gauge };
