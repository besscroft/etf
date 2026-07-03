/**
 * otc 组件共享工具
 */
import {
  OTC_CATEGORY_LABELS,
  type OTCCategory,
  type OTCClassifiedFundData,
} from "~/lib/market-data";
import type { SearchableOTCFund } from "./types";

/** 合并官方基金 + 自选基金，按当前分类过滤，去重 */
export function getVisibleSearchFunds(
  officialFunds: OTCClassifiedFundData[],
  customFunds: Array<{ code: string; name: string; category: OTCCategory }>,
  activeCategory: OTCCategory | "all",
): SearchableOTCFund[] {
  const officialVisible =
    activeCategory === "all"
      ? officialFunds
      : officialFunds.filter((fund) => fund.category === activeCategory);
  const customVisible = customFunds
    .filter((fund) => activeCategory === "all" || fund.category === activeCategory)
    .map(
      (fund): SearchableOTCFund => ({
        code: fund.code,
        name: fund.name,
        category: fund.category,
        categoryLabel: OTC_CATEGORY_LABELS[fund.category],
        custom: true,
      }),
    );
  const customCodes = new Set(customVisible.map((fund) => fund.code));
  const seenOfficial = new Set<string>();
  const dedupedOfficial = officialVisible
    .filter((fund) => {
      const key = `${fund.code}-${fund.category}`;
      if (customCodes.has(fund.code) || seenOfficial.has(key)) return false;
      seenOfficial.add(key);
      return true;
    })
    .map(
      (fund): SearchableOTCFund => ({
        code: fund.code,
        name: fund.name,
        category: fund.category,
        categoryLabel: OTC_CATEGORY_LABELS[fund.category],
        custom: false,
      }),
    );

  return [...customVisible, ...dedupedOfficial];
}
