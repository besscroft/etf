import * as React from "react";

import { cn } from "~/lib/utils";

/**
 * 基础骨架占位组件
 * - 走 animate-pulse + bg-muted，与项目设计令牌对齐
 * - 业务方通过 className 控制尺寸/形状；需要预制形状请用下面的子组件
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** 文本行骨架（默认单行，h-3 w-full） */
function SkeletonLine({
  className,
  width,
  ...props
}: React.ComponentProps<"div"> & { width?: string }) {
  return (
    <Skeleton
      className={cn("h-3", width ? `w-[${width}]` : "w-full", className)}
      style={width ? { width } : undefined}
      {...props}
    />
  );
}

/** 圆/圆点骨架（默认 8x8） */
function SkeletonDot({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("size-2 rounded-full", className)} {...props} />;
}

export { Skeleton, SkeletonLine, SkeletonDot };
