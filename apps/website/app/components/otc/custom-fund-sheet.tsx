/**
 * CustomFundSheet 添加自选基金 Sheet（桌面+移动共用）
 *
 * 80vh 底部抽屉风格，参考 fund-search-sheet.tsx：
 * - 拖拽抓手 + ESC 关闭 + 自动聚焦
 * - 6 位代码 + 名称 + 分类下拉 + 保存 / 保存并加入 双按钮
 * - 错误提示走 sonner toast（2026-07-03 改造：移除内联错误展示）
 * - 复用 ~/stores/custom-otc-funds 的 addFund
 *
 * 与 custom-fund-panel.tsx 的关系：
 * - 旧 panel 把表单内联到桌面布局，挤在中等宽度屏
 * - 新方案把表单挪进 Sheet，从根上消除错位 bug
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { toast } from "sonner";
import { BookmarkPlus, X, Save, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DURATION, EASING } from "~/lib/motion";
import { OTC_CATEGORY_LABELS, OTC_CATEGORY_ORDER, type OTCCategory } from "~/lib/market-data";
import {
  isValidFundCode,
  normalizeFundCode,
  useCustomOTCFundsStore,
} from "~/stores/custom-otc-funds";

interface CustomFundSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 默认分类（从当前 activeCategory 推断） */
  defaultCategory: OTCCategory;
  /** 触发按钮 DOM ref（关闭时还原焦点） */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /** 已达上限时禁用"保存并加入" */
  reachedLimit?: boolean;
  /** 保存后回调（参数为基金代码） */
  onSaved?: (code: string) => void;
  /** 保存并加入：自动关闭 Sheet 并触发 onSaved */
  onSaveAndAdd?: (code: string) => void;
}

export function CustomFundSheet({
  open,
  onOpenChange,
  defaultCategory,
  triggerRef,
  reachedLimit = false,
  onSaved,
  onSaveAndAdd,
}: CustomFundSheetProps) {
  const addCustomFund = useCustomOTCFundsStore((state) => state.addFund);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<OTCCategory>(defaultCategory);
  const [dragY, setDragY] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // 打开时重置表单 + 同步默认分类 + 自动聚焦
  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setCategory(defaultCategory);
      setDragY(0);
      const timer = setTimeout(() => codeInputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [open, defaultCategory]);

  // ESC 关闭 + 还原焦点到触发按钮
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (triggerRef?.current) {
        triggerRef.current.focus();
      }
    };
  }, [open, onOpenChange, triggerRef]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveFund({ addToCompare: false });
  };

  const handleSaveAndAdd = () => {
    saveFund({ addToCompare: true });
  };

  const saveFund = ({ addToCompare }: { addToCompare: boolean }) => {
    const normalizedCode = normalizeFundCode(code);
    if (!isValidFundCode(normalizedCode)) {
      toast.error("请输入 6 位基金代码");
      return;
    }
    const fund = addCustomFund({ code: normalizedCode, name, category });
    if (!fund) {
      toast.error("基金代码格式不正确");
      return;
    }
    if (addToCompare && onSaveAndAdd) {
      onSaveAndAdd(fund.code);
      onOpenChange(false);
    } else {
      onSaved?.(fund.code);
      onOpenChange(false);
    }
  };

  // 拖拽关闭
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
            aria-label="添加自选基金"
            initial={{ y: "100%" }}
            animate={{ y: dragY }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDrag={(_, info) => info.offset.y > 0 && setDragY(Math.min(info.offset.y, 200))}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-[95] flex max-h-[85vh] flex-col rounded-t-2xl bg-background shadow-2xl"
          >
            {/* 抓手 + 头部 */}
            <div className="shrink-0 touch-none border-b">
              <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center justify-between px-4 pb-3 pt-2">
                <div className="flex items-center gap-2">
                  <BookmarkPlus className="size-4 text-primary" />
                  <h2 className="text-base font-semibold">添加自选基金</h2>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="关闭"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* 表单 */}
            <form
              onSubmit={handleSubmit}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <div className="space-y-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">基金代码</span>
                  <input
                    ref={codeInputRef}
                    value={code}
                    onChange={(event) => {
                      setCode(normalizeFundCode(event.target.value));
                    }}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="例如 006327"
                    className="h-10 rounded-lg border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    名称 <span className="text-muted-foreground/60">（可选）</span>
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={60}
                    placeholder="留空则用代码命名"
                    className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">分类</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as OTCCategory)}
                    className="h-10 rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {OTC_CATEGORY_ORDER.map((item) => (
                      <option key={item} value={item}>
                        {OTC_CATEGORY_LABELS[item]}
                      </option>
                    ))}
                  </select>
                </label>

                {reachedLimit && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    对比数量已达上限，请先移除部分基金再加入。
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button type="submit" variant="outline" className="h-10 flex-1 sm:flex-none">
                    <Save className="size-4" />
                    保存
                  </Button>
                  <Button
                    type="button"
                    className="h-10 flex-1 sm:flex-none"
                    onClick={handleSaveAndAdd}
                    disabled={reachedLimit}
                  >
                    <Plus className="size-4" />
                    保存并加入对比
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
