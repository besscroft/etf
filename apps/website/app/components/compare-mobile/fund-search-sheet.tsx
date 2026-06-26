/**
 * FundSearchSheet 移动端底部抽屉搜索
 *
 * 用于在移动端添加对比基金：
 * - 从底部滑入的抽屉（80vh）
 * - 支持基金代码/名称模糊搜索
 * - 已选基金过滤、上限禁用提示
 * - 拖拽抓手下滑关闭
 *
 * 不引入新依赖：基于 motion 实现，与项目技术栈一致
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { Search, X, Plus, Check } from "lucide-react";
import { DURATION, EASING } from "~/lib/motion";
import { MAX_COMPARE } from "./constants";

interface FundListItem {
  code: string;
  name: string;
}

interface FundSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 全量基金列表 */
  fundList: FundListItem[];
  /** 已选基金代码集合 */
  selectedCodes: string[];
  /** 添加基金回调 */
  onAdd: (code: string) => void;
}

export function FundSearchSheet({
  open,
  onOpenChange,
  fundList,
  selectedCodes,
  onAdd,
}: FundSearchSheetProps) {
  const [query, setQuery] = useState("");
  const [dragY, setDragY] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时自动聚焦搜索框
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
    // 关闭时清空查询
    setQuery("");
    setDragY(0);
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

  // 搜索过滤
  const filtered = useMemo(() => {
    if (!query.trim()) return fundList.slice(0, 50);
    const q = query.trim().toLowerCase();
    return fundList
      .filter((f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [fundList, query]);

  const handleAdd = (code: string) => {
    onAdd(code);
    // 添加后不关闭抽屉，便于继续添加；达到上限后自动关闭
    if (selectedCodes.length + 1 >= MAX_COMPARE) {
      onOpenChange(false);
    }
  };

  // 拖拽关闭：向下拖拽超过 80px 释放关闭
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) {
      onOpenChange(false);
    } else {
      setDragY(0);
    }
  };

  const reachedLimit = selectedCodes.length >= MAX_COMPARE;

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
            aria-label="添加基金"
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
                  <h2 className="text-base font-semibold">添加基金</h2>
                  <span className="text-xs text-muted-foreground">
                    ({selectedCodes.length}/{MAX_COMPARE})
                  </span>
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

            {/* 搜索框 */}
            <div className="shrink-0 touch-none px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索基金代码或名称"
                  className="h-10 w-full rounded-lg border bg-muted/30 pl-10 pr-4 text-sm outline-none focus:bg-background focus:ring-2 focus:ring-primary/20"
                  disabled={reachedLimit}
                />
              </div>
              {reachedLimit && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  已达上限 {MAX_COMPARE} 只，请先移除部分基金
                </p>
              )}
            </div>

            {/* 列表 */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {filtered.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  {query.trim() ? "无匹配结果" : "暂无可选基金"}
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((f) => {
                    const selected = selectedCodes.includes(f.code);
                    const disabled = selected || reachedLimit;
                    return (
                      <li key={f.code}>
                        <button
                          onClick={() => !disabled && handleAdd(f.code)}
                          disabled={disabled}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-colors enabled:hover:bg-muted disabled:opacity-50"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-xs text-muted-foreground">
                              {f.code}
                            </span>
                            <span className="block truncate font-medium">{f.name}</span>
                          </span>
                          {selected ? (
                            <Check className="size-4 shrink-0 text-emerald-500" />
                          ) : (
                            <Plus className="size-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
