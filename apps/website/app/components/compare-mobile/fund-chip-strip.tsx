/**
 * FundChipStrip 已选基金横向条
 *
 * 用于在移动端底部固定显示当前已选基金：
 * - 横向滚动展示基金 Chip（含颜色标识）
 * - 左滑 Chip 触发删除
 * - 显示数量计数
 */
import { useRef } from "react";
import { motion, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { getCompareColor, MAX_COMPARE } from "./constants";

interface FundChipStripProps {
  /** 已选基金（顺序与颜色索引一致） */
  funds: Array<{ code: string; name: string }>;
  onRemove: (code: string) => void;
  /** 点击 Chip 滚动到对应基金卡片（可选） */
  onSelect?: (code: string) => void;
}

export function FundChipStrip({ funds, onRemove, onSelect }: FundChipStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (funds.length === 0) {
    return (
      <div className="flex h-9 items-center px-4 text-xs text-muted-foreground">暂未选择基金</div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-2 overflow-x-auto px-4 py-2 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {funds.map((fund, idx) => (
        <ChipItem
          key={fund.code}
          fund={fund}
          colorIdx={idx}
          onRemove={onRemove}
          onSelect={onSelect}
        />
      ))}
      <span className="shrink-0 text-xs text-muted-foreground">
        ({funds.length}/{MAX_COMPARE})
      </span>
    </div>
  );
}

function ChipItem({
  fund,
  colorIdx,
  onRemove,
  onSelect,
}: {
  fund: { code: string; name: string };
  colorIdx: number;
  onRemove: (code: string) => void;
  onSelect?: (code: string) => void;
}) {
  const color = getCompareColor(colorIdx);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // 左滑超过 40px 触发删除
    if (info.offset.x < -40) {
      onRemove(fund.code);
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -64, right: 0 }}
      dragElastic={0.15}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className="relative flex h-7 shrink-0 items-center gap-1.5 rounded-full border bg-secondary pl-2.5 pr-1.5 text-xs font-medium touch-none"
      style={{ borderColor: color.line }}
      onClick={() => onSelect?.(fund.code)}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color.line }}
        aria-hidden="true"
      />
      <span className="max-w-[7rem] truncate">{fund.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(fund.code);
        }}
        className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`移除 ${fund.name}`}
      >
        <X className="size-3" />
      </button>
    </motion.div>
  );
}
