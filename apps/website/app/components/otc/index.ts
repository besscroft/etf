/**
 * 场外基金组件统一入口
 *
 * 集中导出 otc 路由专用组件，路由文件统一从此处导入：
 * - CategoryChips：分类 chips（桌面 + 移动共用）
 * - CustomFundSheet：添加自选 Sheet（桌面 + 移动共用）
 * - CustomFundListCard：桌面端自选基金只读列表 Card
 * - FundSearchSection：桌面端"选择基金"复合 Card
 * - SelectedFundChips：桌面端已选基金 chips
 * - SectionHeader：桌面端 Section 标题范式（图标 + 标题 + 副标题 + right）
 * - MetricsCompare：桌面端自适应核心指标对比（1-2 Card 网格 / 3+ 表格）
 * - NavTrendOverlay / PerformanceComparison：桌面端净值走势 / 阶段收益
 */
export { CategoryChips } from "./category-chips";
export { CustomFundSheet } from "./custom-fund-sheet";
export { CustomFundListCard } from "./custom-fund-list-card";
export { FundSearchSection } from "./fund-search-section";
export { SelectedFundChips } from "./selected-fund-chips";
export { SectionHeader } from "./section-header";
export { MetricsCompare } from "./metrics-compare";
export { NavTrendOverlay, PerformanceComparison } from "./compare-sections";
export type { SearchableOTCFund, SearchableFundItem } from "./types";
