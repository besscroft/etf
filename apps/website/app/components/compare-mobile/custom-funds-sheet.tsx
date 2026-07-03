/**
 * CustomFundsSheet 移动端"自选基金"浏览 Sheet
 *
 * 与 fund-search-sheet.tsx 风格一致：80vh 底部抽屉、拖拽抓手、ESC 关闭。
 * 内容：所有自选基金列表（按 customFunds 传入），每项可加入对比 / 删除。
 * "保存并加入"已有（fund-search-sheet.tsx 实现），本组件只承担浏览/增删入口。
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { X, Plus, Check, Trash2, Database } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { DURATION, EASING } from "~/lib/motion";
import { OTC_CATEGORY_LABELS, type OTCCategory } from "~/lib/market-data";
import { useCustomOTCFundsStore, type CustomOTCFund } from "~/stores/custom-otc-funds";
import { MAX_COMPARE } from "./constants";

interface CustomFundsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 自选基金列表（已 hydrate） */
  customFunds: CustomOTCFund[];
  /** 已选基金代码集合 */
  selectedCodes: string[];
  /** 加入对比 */
  onAdd: (code: string) => void;
  /** 添加流程（由 fund-search-sheet 接管，本组件不重复实现） */
  onAddCustom?: (code: string) => void;
}

export function CustomFundsSheet({
  open,
  onOpenChange,
  customFunds,
  selectedCodes,
  onAdd,
}: CustomFundsSheetProps) {
  const removeCustomFund = useCustomOTCFundsStore((state) => state.removeFund);
  const [dragY, setDragY] = useState(0);

  // 关闭时重置拖拽
  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // 按分类分组
  const grouped = useMemo(() => {
    const map = new Map<OTCCategory | "其他", CustomOTCFund[]>();
    for (const fund of customFunds) {
      const key = fund.category in OTC_CATEGORY_LABELS ? fund.category : "其他";
      const list = map.get(key) ?? [];
      list.push(fund);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [customFunds]);

  const reachedLimit = selectedCodes.length >= MAX_COMPARE;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) {
      onOpenChange(false);
    } else {
      setDragY(0);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />

          {/* 抽屉 */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="自选基金"
            initial={{ y: "100%" }}
            animate={{ y: dragY }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDrag={(_, info) => info.offset.y > 0 && setDragY(Math.min(info.offset.y, 200))}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-[95] flex h-[80vh] flex-col rounded-t-2xl bg-background shadow-2xl"
          >
            {/* 抓手 + 头部 */}
            <div className="shrink-0 touch-none border-b">
              <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center justify-between px-4 pb-3 pt-2">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-primary" />
                  <h2 className="text-base font-semibold">自选基金</h2>
                  <span className="text-xs text-muted-foreground">({customFunds.length})</span>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="关闭"
                >
                  <X className="size-4" />
                </button>
              </div>
              {reachedLimit && (
                <p className="px-4 pb-3 text-xs text-amber-600 dark:text-amber-400">
                  已达上限 {MAX_COMPARE} 只，请先移除部分基金
                </p>
              )}
            </div>

            {/* 列表 */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {customFunds.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <Database className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">还没有自选基金</p>
                  <p className="text-xs text-muted-foreground/70">
                    在「添加基金」搜索 6 位代码，可保存到本浏览器
                  </p>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  {grouped.map(([category, funds]) => (
                    <section key={category}>
                      <h3 className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
                        {category === "其他" ? "其他" : OTC_CATEGORY_LABELS[category]}
                        <span className="ml-1 text-muted-foreground/60">({funds.length})</span>
                      </h3>
                      <ul className="space-y-0.5">
                        {funds.map((fund) => {
                          const selected = selectedCodes.includes(fund.code);
                          const disabled = selected || reachedLimit;
                          return (
                            <li key={fund.code}>
                              <div className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm">
                                <div className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {fund.code}
                                    </span>
                                    {selected && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        已选
                                      </Badge>
                                    )}
                                  </span>
                                  <p className="mt-0.5 truncate font-medium">{fund.name}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => !disabled && onAdd(fund.code)}
                                  disabled={disabled}
                                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors enabled:hover:bg-muted enabled:hover:text-foreground disabled:opacity-40"
                                  aria-label={selected ? "已加入对比" : "加入对比"}
                                >
                                  {selected ? (
                                    <Check className="size-4 text-emerald-500" />
                                  ) : (
                                    <Plus className="size-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCustomFund(fund.code)}
                                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`删除自选 ${fund.name}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
