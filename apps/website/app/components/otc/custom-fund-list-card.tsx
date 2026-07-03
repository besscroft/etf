/**
 * CustomFundListCard 桌面端"自选基金"只读列表
 *
 * 由 CardHeader + Card 改为 SectionHeader + Card 拆分结构（更接近 otc-funds.tsx
 * 的统一节奏）：标题 + 添加按钮外置 SectionHeader，Card 只承载列表。
 *
 * 重写自原 custom-fund-panel.tsx：
 * - 旧版把表单内联到 Card，挤在中等宽度屏
 * - 中版退化为"只读紧凑列表 + 右上角 + 按钮弹 Sheet"
 * - 现在用 SectionHeader 把"添加"按钮外置，避免 CardHeader 上塞太多东西
 *
 * 列表项动效：用 AnimatePresence + layout，让增删位置平滑过渡。
 * 焦点还原：addButtonRef 在打开 Sheet 时记录，关闭时由 CustomFundSheet 还原。
 */
import { useState, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Database, Plus, Trash2, BookmarkPlus, BarChart3 } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { OTC_CATEGORY_LABELS, type OTCCategory } from "~/lib/market-data";
import { useCustomOTCFundsHydration, useCustomOTCFundsStore } from "~/stores/custom-otc-funds";
import { DURATION } from "~/lib/motion";
import { MAX_COMPARE } from "~/components/compare-mobile/constants";
import { SectionHeader } from "./section-header";
import { CustomFundSheet } from "./custom-fund-sheet";

interface CustomFundListCardProps {
  activeCategory: OTCCategory | "all";
  selectedCodes: string[];
  reachedLimit: boolean;
  onAdd: (code: string) => void;
}

export function CustomFundListCard({
  activeCategory,
  selectedCodes,
  reachedLimit,
  onAdd,
}: CustomFundListCardProps) {
  const hasHydrated = useCustomOTCFundsHydration();
  const customFunds = useCustomOTCFundsStore((state) => state.funds);
  const removeCustomFund = useCustomOTCFundsStore((state) => state.removeFund);

  const [sheetOpen, setSheetOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const defaultCategory: OTCCategory = activeCategory === "all" ? "qdii" : activeCategory;

  const visibleCustomFunds = useMemo(() => {
    if (activeCategory === "all") return customFunds;
    return customFunds.filter((fund) => fund.category === activeCategory);
  }, [activeCategory, customFunds]);

  const selectedCodeSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  return (
    <div className="space-y-2">
      <SectionHeader
        icon={Database}
        title="自选基金"
        description={
          hasHydrated && customFunds.length > 0
            ? `本设备共 ${customFunds.length} 只，当前分类下 ${visibleCustomFunds.length} 只`
            : "保存常用基金到本浏览器，方便快速加入对比"
        }
        right={
          <Button
            ref={addButtonRef}
            variant="default"
            size="sm"
            onClick={() => setSheetOpen(true)}
            aria-controls="custom-fund-sheet"
            aria-expanded={sheetOpen}
          >
            <Plus className="size-4" />
            添加
          </Button>
        }
      />

      <Card>
        <CardContent className="py-3">
          {!hasHydrated ? (
            <p className="text-sm text-muted-foreground">正在读取浏览器自选...</p>
          ) : visibleCustomFunds.length === 0 ? (
            <EmptyState activeCategory={activeCategory} hasAnyFunds={customFunds.length > 0} />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {visibleCustomFunds.map((fund) => {
                  const selected = selectedCodeSet.has(fund.code);
                  return (
                    <motion.li
                      key={fund.code}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: DURATION.fast, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <CustomFundItem
                        code={fund.code}
                        name={fund.name}
                        category={fund.category}
                        selected={selected}
                        reachedLimit={reachedLimit}
                        onAdd={() => onAdd(fund.code)}
                        onRemove={() => removeCustomFund(fund.code)}
                      />
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>

      <CustomFundSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultCategory={defaultCategory}
        reachedLimit={reachedLimit}
        triggerRef={addButtonRef}
        onSaveAndAdd={(code) => onAdd(code)}
      />
    </div>
  );
}

function CustomFundItem({
  code,
  name,
  category,
  selected,
  reachedLimit,
  onAdd,
  onRemove,
}: {
  code: string;
  name: string;
  category: OTCCategory;
  selected: boolean;
  reachedLimit: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{code}</span>
          <Badge variant="secondary" className="text-[10px]">
            {OTC_CATEGORY_LABELS[category]}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-sm font-medium">{name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onAdd}
          disabled={selected || reachedLimit}
          aria-label={selected ? "已加入对比" : "加入对比"}
          title={selected ? "已加入对比" : reachedLimit ? `已达上限 ${MAX_COMPARE} 只` : "加入对比"}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="删除自选基金"
          title="删除自选"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  activeCategory,
  hasAnyFunds,
}: {
  activeCategory: OTCCategory | "all";
  hasAnyFunds: boolean;
}) {
  if (hasAnyFunds && activeCategory !== "all") {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm text-muted-foreground">当前分类下还没有自选基金</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="rounded-full bg-muted p-3">
        <BarChart3 className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">还没有自选基金</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          点击右上角「添加」按钮，保存常用基金到本浏览器
        </p>
      </div>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
        <BookmarkPlus className="size-3" />
        仅保存在本设备，不会上传
      </p>
    </div>
  );
}
