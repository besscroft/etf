/**
 * otc 组件共享类型
 */
import type { OTCCategory } from "~/lib/market-data";

/** 搜索下拉中显示的基金项（合并官方 + 自选） */
export interface SearchableOTCFund {
  code: string;
  name: string;
  category: OTCCategory;
  categoryLabel: string;
  custom?: boolean;
}

/** 简化的基金项（仅用于选择 UI） */
export interface SearchableFundItem {
  code: string;
  name: string;
  categoryLabel?: string;
  custom?: boolean;
}
