/**
 * SectionHeader 桌面端 Section 视觉范式
 *
 * 统一 /otc-funds 路由的视觉节奏：标题 + 副标题 + 右侧 actions 槽位。
 * 旧版 3 段 Card 各自带 CardHeader，缺少统一节奏；现在抽出来集中维护。
 *
 * 视觉层级（与 otc-funds.tsx 排版规范对齐）：
 * - 标题 text-base md:text-lg font-semibold + text-primary icon
 * - 副标题 text-xs text-muted-foreground
 * - 桌面端水平排列（flex justify-between），移动端由调用方传 compact
 *
 * 典型用法：
 * ```tsx
 * <SectionHeader
 *   icon={Search}
 *   title="选择基金"
 *   description="搜索或选择 2-4 只基金开始多维度对比"
 *   right={<CategoryChips active={activeCategory} onChange={setCategory} />}
 * />
 * <Card>...</Card>
 * ```
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  /** 左侧图标（建议 text-primary） */
  icon: LucideIcon;
  /** 主标题 */
  title: string;
  /** 副标题（可选，1 行 muted） */
  description?: string;
  /** 右侧额外内容（chips、徽章、按钮等） */
  right?: ReactNode;
  /** 自定义 class */
  className?: string;
  /** 标题层级 h2（默认）/ h3，文档层级需要时切换 */
  as?: "h2" | "h3";
  /** 紧凑模式：移动端上下堆叠（默认桌面水平） */
  compact?: boolean;
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  right,
  className = "",
  as: Heading = "h2",
  compact = false,
}: SectionHeaderProps) {
  return (
    <div
      className={`flex gap-3 ${
        compact ? "flex-col items-start" : "flex-wrap items-center justify-between gap-y-2"
      } ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-primary md:size-5" aria-hidden="true" />
          <Heading
            className={`font-semibold tracking-tight ${
              compact ? "text-base" : "text-base md:text-lg"
            }`}
          >
            {title}
          </Heading>
        </div>
        {description && (
          <p className="mt-1 pl-6 text-xs text-muted-foreground md:pl-7">{description}</p>
        )}
      </div>
      {right && <div className={compact ? "w-full" : "shrink-0"}>{right}</div>}
    </div>
  );
}
