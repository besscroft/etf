/**
 * 股票详情页骨架（2026-07-03 新增）
 *
 * 配合 defer loader + AsyncSection 使用。
 * 渲染节奏：面包屑 → 标题 → 实时价卡片 → 行情图 → 信息 Tab
 */

import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function StockPageSkeleton({ code }: { code: string }) {
  return (
    <div>
      {/* 面包屑骨架 */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>首页</span>
        <span>/</span>
        <span>A股行情</span>
        <span>/</span>
        <Skeleton className="h-3 w-12" />
      </div>

      {/* 标题骨架 */}
      <div className="mb-4 flex items-end gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-14 rounded" />
          </div>
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
      </div>

      {/* 实时价卡片骨架 */}
      <Card className="mb-4">
        <CardContent className="py-5">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="mb-4 flex items-end gap-3">
            <Skeleton className="h-10 w-32" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 行情图骨架 */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-7 w-14" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="chart-skeleton chart-skeleton-tall w-full" />
        </CardContent>
      </Card>

      {/* 信息 Tab 骨架 */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-dashed py-1.5"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        股票代码 {code} · 数据仅供参考，不构成投资建议
      </p>
    </div>
  );
}
