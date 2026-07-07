/**
 * FundSearchSection 桌面端"选择基金"复合 Card
 *
 * 父组件 otc-funds.tsx 用 SectionHeader 包裹本组件：
 * - 父：SectionHeader(icon=Search, title, description, right=CategoryChips)
 * - 子：本 Card（搜索 + 建议下拉 + 已选基金 chips）
 *
 * 把分类 chips 从 Card 内上移到外层 SectionHeader.right，避免在 Card 内部
 * 出现"分类 chips" 与"搜索框" 紧贴造成视觉拥挤。
 *
 * 数据：父组件已通过 Suspense+Await 解析，传入 resolved 数组。
 */
import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  OTC_CATEGORY_LABELS,
  type OTCCategory,
  type OTCClassifiedFundData,
  type FundDetailData,
} from "~/lib/market-data";
import { MAX_COMPARE } from "~/components/compare-mobile/constants";
import { SelectedFundChips } from "./selected-fund-chips";
import { getVisibleSearchFunds } from "./search-utils";

interface FundSearchSectionProps {
  /** 当前分类（URL 同步） */
  activeCategory: OTCCategory | "all";
  /** 基金列表（已 resolved） */
  fundList: OTCClassifiedFundData[];
  /** 自选基金 */
  customFunds: Array<{ code: string; name: string; category: OTCCategory }>;
  /** 已选基金详情（已 resolved） */
  fundDetails: Array<FundDetailData & { error?: string }>;
  /** 已选基金代码（来自 URL） */
  selectedCodes: string[];
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
}

export function FundSearchSection({
  activeCategory,
  fundList,
  customFunds,
  fundDetails,
  selectedCodes,
  onAdd,
  onRemove,
}: FundSearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const reachedLimit = selectedCodes.length >= MAX_COMPARE;

  return (
    <Card>
      {/* 搜索 + 下拉 */}
      <div className="px-4 pt-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeCategory === "all"
                ? "搜索基金代码或名称..."
                : `搜索${OTC_CATEGORY_LABELS[activeCategory]}基金...`
            }
            className="h-10 w-full rounded-lg border bg-background pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            disabled={reachedLimit}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="清空搜索"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* 建议下拉 */}
        {(() => {
          const q = searchQuery.trim().toLowerCase();
          if (!q) return null;
          const visibleList = getVisibleSearchFunds(fundList, customFunds, activeCategory);
          const filtered = visibleList.filter(
            (f) =>
              !selectedCodes.includes(f.code) &&
              (f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)),
          );
          if (filtered.length === 0) return null;
          return (
            <div
              className="mt-1.5 max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-lg"
              role="listbox"
            >
              {filtered.slice(0, 20).map((f) => (
                <button
                  key={`${f.custom ? "custom" : "fund"}-${f.code}-${f.category}`}
                  onClick={() => {
                    onAdd(f.code);
                    setSearchQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  role="option"
                  aria-selected="false"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-muted-foreground">{f.code}</span>
                    <span className="ml-2 truncate">{f.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {f.custom ? "自选" : f.categoryLabel}
                    </Badge>
                    <Plus className="size-4 text-muted-foreground" />
                  </span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 已选基金 chips */}
      <div className="border-t px-4 py-3">
        <SelectedFundChips
          funds={fundDetails.map((f) => ({ code: f.code, name: f.name || f.code }))}
          onRemove={onRemove}
        />
        {selectedCodes.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCategory === "all"
              ? `搜索并选择最多 ${MAX_COMPARE} 只基金进行对比（覆盖股票/混合/指数/债券/FOF）`
              : `搜索并选择最多 ${MAX_COMPARE} 只${OTC_CATEGORY_LABELS[activeCategory]}基金进行对比`}
          </p>
        )}
      </div>
    </Card>
  );
}
