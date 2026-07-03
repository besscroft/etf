/**
 * SelectedFundChips 桌面端已选基金 chips
 *
 * 用 AnimatePresence + motion.div layout 让增删时位置平滑过渡。
 * 颜色按 COMPARE_COLORS[idx] 索引（与移动端 fund-chip-strip 一致）。
 *
 * 注意：动态增删不用 stagger（避免每次 setState 触发全场再入场）。
 */
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { getCompareColor, MAX_COMPARE } from "~/components/compare-mobile/constants";
import { DURATION } from "~/lib/motion";

interface SelectedFundChipsProps {
  /** 已选基金（顺序与颜色索引一致） */
  funds: Array<{ code: string; name: string }>;
  onRemove: (code: string) => void;
}

export function SelectedFundChips({ funds, onRemove }: SelectedFundChipsProps) {
  if (funds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        已选 <span className="text-foreground">{funds.length}</span>
        <span className="text-muted-foreground">/{MAX_COMPARE}</span>
      </span>
      <AnimatePresence initial={false} mode="popLayout">
        {funds.map((fund, idx) => {
          const color = getCompareColor(idx);
          return (
            <motion.div
              key={fund.code}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: DURATION.fast, ease: [0.16, 1, 0.3, 1] }}
            >
              <Badge
                variant="secondary"
                className="h-7 gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: color.line, borderWidth: 1.5 }}
              >
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color.line }}
                  aria-hidden="true"
                />
                <span className="max-w-[10rem] truncate">{fund.name}</span>
                <button
                  onClick={() => onRemove(fund.code)}
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`移除 ${fund.name}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {funds.length < MAX_COMPARE && (
        <span className="text-xs text-muted-foreground">
          还可添加 {MAX_COMPARE - funds.length} 只
        </span>
      )}
    </div>
  );
}
