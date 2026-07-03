/**
 * CategoryChips 基金分类过滤器
 *
 * 桌面/移动共用的分类 chips 组件：
 * - 全部 + 6 类基金（股票/混合/指数/债券/QDII/FOF）
 * - URL 同步由父组件处理
 * - compact 模式：移动端横向滚动（避免换行导致高度跳动）
 * - 默认模式：桌面端 flex-wrap
 *
 * 设计要点：
 * - 选中态用 bg-primary + text-primary-foreground
 * - 非选中态用 bg-muted + text-muted-foreground，hover 加深
 * - 左侧可选显示"分类"标签 + Filter 图标
 */
import { Filter } from "lucide-react";
import { OTC_CATEGORY_LABELS, OTC_CATEGORY_ORDER, type OTCCategory } from "~/lib/market-data";

interface CategoryChipsProps {
  active: OTCCategory | "all";
  onChange: (cat: OTCCategory | "all") => void;
  /** 紧凑模式：移动端横向滚动，桌面端走默认 wrap */
  compact?: boolean;
}

export function CategoryChips({ active, onChange, compact = false }: CategoryChipsProps) {
  const items: Array<{ key: OTCCategory | "all"; label: string }> = [
    { key: "all", label: "全部" },
    ...OTC_CATEGORY_ORDER.map((c) => ({ key: c, label: OTC_CATEGORY_LABELS[c] })),
  ];

  return (
    <div
      className={`flex items-center gap-1.5 ${compact ? "overflow-x-auto" : "flex-wrap"}`}
      role="tablist"
      aria-label="基金分类"
    >
      {!compact && (
        <span className="flex items-center gap-1 pr-1 text-xs text-muted-foreground">
          <Filter className="size-3.5" />
          分类
        </span>
      )}
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
