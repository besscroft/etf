/**
 * 面包屑导航 UI 组件
 * - 与 seo.ts 的 buildBreadcrumbJsonLd 配合使用：items 同时驱动 UI 和结构化数据
 * - 末项（当前页）渲染为纯文本（非链接），符合 WAI-ARIA Breadcrumb 模式
 * - 简洁样式：与项目 Tailwind 主题色一致（小字、灰色、hover 变深）
 */
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { AppLink as Link } from "./link";
import type { BreadcrumbItem } from "~/lib/seo";

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** 容器额外 className，默认 "mb-4 text-sm" */
  className?: string;
}

export function Breadcrumb({ items, className = "mb-4 text-sm" }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${idx}-${item.name}`} className="flex items-center gap-1">
              {idx > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.path ? (
                <span
                  className={isLast ? "font-medium text-foreground" : ""}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="transition-colors hover:text-foreground"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// 重新导出类型方便业务侧 import
export type { BreadcrumbItem } from "~/lib/seo";
