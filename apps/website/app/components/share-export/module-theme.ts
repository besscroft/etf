/**
 * 各功能模块导出主题配置
 *
 * 每个模块拥有专属配色与图标，确保导出图片具备辨识度。
 * 配色取自项目已有的视觉语言（纳指蓝 / 标普绿 / 主动橙 / QDII 紫 等）。
 */
import { BarChart3, Shield, Activity, LineChart, Trophy, Users, Gauge } from "lucide-react";
import type { ModuleKey, ModuleTheme } from "./types";

export const MODULE_THEMES: Record<ModuleKey, ModuleTheme> = {
  nasdaq: {
    title: "场外纳斯达克100（被动型）",
    subtitle: "NASDAQ 100 Passive Funds",
    primary: "#3b82f6",
    gradientEnd: "#1d4ed8",
    accent: "#2563eb",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  sp500: {
    title: "场外标普500（被动型）",
    subtitle: "S&P 500 Passive Funds",
    primary: "#10b981",
    gradientEnd: "#047857",
    accent: "#059669",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  active: {
    title: "场外美股（主动型）",
    subtitle: "Active US Equity Funds",
    primary: "#f59e0b",
    gradientEnd: "#b45309",
    accent: "#d97706",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  qdii: {
    title: "QDII 基金一览",
    subtitle: "All QDII Funds",
    primary: "#8b5cf6",
    gradientEnd: "#6d28d9",
    accent: "#7c3aed",
    source: "天天基金网 / 东方财富",
    Icon: BarChart3,
  },
  valuation: {
    title: "QDII 基金估值",
    subtitle: "Real-time Valuation",
    primary: "#06b6d4",
    gradientEnd: "#0e7490",
    accent: "#0891b2",
    source: "天天基金网 · 估值仅供参考",
    Icon: Activity,
  },
  "fund-detail": {
    title: "基金详情",
    subtitle: "Fund Detail",
    primary: "#1e40af",
    gradientEnd: "#1e3a8a",
    accent: "#2563eb",
    source: "天天基金网 / 东方财富",
    Icon: LineChart,
  },
  "fund-compare": {
    title: "基金对比",
    subtitle: "Fund Comparison",
    primary: "#6366f1",
    gradientEnd: "#4338ca",
    accent: "#4f46e5",
    source: "天天基金网 / 东方财富",
    Icon: Trophy,
  },
  stable: {
    title: "中美稳健理财对比",
    subtitle: "Stable Yield Products",
    primary: "#d97706",
    gradientEnd: "#92400e",
    accent: "#b45309",
    source: "公开数据整理",
    Icon: Shield,
  },
  analysis: {
    title: "基金深度分析",
    subtitle: "Fund Analysis",
    primary: "#6366f1",
    gradientEnd: "#3730a3",
    accent: "#4f46e5",
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
