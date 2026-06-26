/**
 * 移动端对比组件共享常量
 *
 * - COMPARE_COLORS：基金对比颜色序列，与桌面端保持一致
 *   后续可统一抽取到 ~/lib/compare-constants.ts，由桌面/移动端共用
 * - MAX_COMPARE：对比基金数量上限
 * - CompareTab：移动端 Tab 类型
 */
export const COMPARE_COLORS = [
  { line: "#3b82f6", fill: "rgba(59,130,246,0.1)", label: "蓝" }, // 蓝
  { line: "#ef4444", fill: "rgba(239,68,68,0.1)", label: "红" }, // 红
  { line: "#10b981", fill: "rgba(16,185,129,0.1)", label: "绿" }, // 绿
  { line: "#f59e0b", fill: "rgba(245,158,11,0.1)", label: "橙" }, // 橙
] as const;

export const MAX_COMPARE = 4;

/** 移动端三段式 Tab */
export type CompareTab = "metrics" | "trend" | "performance";

/** Tab 配置 */
export const COMPARE_TABS: Array<{ key: CompareTab; label: string }> = [
  { key: "metrics", label: "指标" },
  { key: "trend", label: "走势" },
  { key: "performance", label: "收益" },
];

/** 按索引获取对比颜色，保证越界安全 */
export function getCompareColor(idx: number) {
  return COMPARE_COLORS[idx % COMPARE_COLORS.length];
}
