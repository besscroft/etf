/**
 * 移动端基金对比组件统一入口
 *
 * 仅在 useIsMobile() 为 true 时由 routes/compare.tsx 引入。
 * 桌面端保持原 CompareContent 实现，互不影响。
 */
export { MobileCompareLayout } from "./mobile-compare-layout";
export { FundSearchSheet } from "./fund-search-sheet";
export { FundChipStrip } from "./fund-chip-strip";
export { MetricsCompareCard } from "./metrics-compare-card";
export { TrendChartMobile } from "./trend-chart-mobile";
export { PerformanceBarsMobile } from "./performance-bars-mobile";
export { COMPARE_COLORS, MAX_COMPARE, COMPARE_TABS, getCompareColor } from "./constants";
export type { CompareTab } from "./constants";
