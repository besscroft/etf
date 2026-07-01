/**
 * 业务级骨架占位组件
 *
 * 这里集中放"和数据长得像但不带数据"的占位组件，配合 defer + <AsyncSection> 使用。
 * 命名约定：xxxSkeleton 与真实组件 1:1 对应，定位为同位置替换。
 *
 * 设计目标：
 * - 尺寸/排布/语义与真实数据视图一致，避免加载完成后跳变（CLS）
 * - 不用项目里其它业务组件（避免循环依赖），直接用基础 Skeleton + Card 组合
 * - 暗色模式友好（走 bg-muted 令牌）
 */
import { Skeleton, SkeletonLine } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

/* ==================== 首页 ==================== */

/** 首页首屏：4 个大盘指数卡片（纳指/纳指100/标普/道琼） */
export function HomeHeroSkeleton() {
  return (
    <section className="py-8 md:py-16">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col items-center gap-1 py-3 text-center sm:py-4">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-20 sm:h-7" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/** 首页市场情绪指标：4 个指标卡（VIX/恐慌贪婪/PE/纳指PE） */
export function MarketIndicatorsSkeleton() {
  return (
    <section className="mb-8 md:mb-10">
      <SectionTitleSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-end gap-2">
                <Skeleton className="h-7 w-20 md:h-9" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/** 首页综合市场温度：单卡片（温度计 + 三因子） */
export function MarketTemperatureSkeleton() {
  return (
    <section className="mb-8 md:mb-10">
      <SectionTitleSkeleton />
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-3 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-3 h-6 w-32 md:h-7" />
          <Skeleton className="mb-2 h-3 w-full md:h-4" />
          <div className="mb-4 flex justify-between">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-md border p-2 text-center">
                <Skeleton className="mx-auto h-3 w-12" />
                <Skeleton className="mx-auto mt-1 h-4 w-14" />
                <Skeleton className="mx-auto mt-1 h-3 w-10" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/** 首页 QDII 基金区：搜索 + 筛选 + 列表 */
export function QDIIFundSectionSkeleton() {
  return (
    <section className="mb-8 md:mb-10">
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <SectionTitleSkeleton className="mb-0" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mb-3 h-9 w-full" />
      <div className="mb-4 flex gap-2 sm:gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-28" />
      </div>
      {/* 移动端卡片堆叠 */}
      <div className="flex flex-col gap-2 pb-24 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-3">
              <div className="flex justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* 桌面端表格 */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-3">
              <div className="flex gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-20" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 border-t pt-2">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-20" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ==================== 基金对比 / 场外基金对比 ==================== */

/** 基金对比/分析/场外基金：搜索面板骨架 */
export function FundSearchSkeleton() {
  return (
    <div className="mb-6 space-y-3">
      <Skeleton className="h-9 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16" />
        ))}
      </div>
    </div>
  );
}

/** 基金对比：选中的几只基金横向卡片骨架 */
export function FundCompareGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-12" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-7 w-16" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="mt-1 h-4 w-14" />
                </div>
              ))}
            </div>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** 单只基金详情（对比/分析页内）：标题 + 关键指标 + 图表 */
export function FundDetailPanelSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="mx-auto h-3 w-12" />
                <Skeleton className="mx-auto mt-1 h-6 w-16" />
                <Skeleton className="mx-auto mt-1 h-3 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/* ==================== 基金详情页 ==================== */

/** 基金详情页：基础信息加载完后，下方重数据区（图表/重仓/经理/历史）的占位 */
export function FundDetailHeavySkeleton() {
  return (
    <div className="space-y-6">
      {/* 净值走势 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
      {/* 阶段收益 + 重仓股 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* 经理 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b pb-2">
              <div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-1 h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ==================== QDII / 子分类列表 ==================== */

/** QDII / 纳指 / 标普 / 主动型 / 估值 / 场外基金列表：搜索 + 表格/卡片 */
export function FundListTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16" />
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-3">
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-t pt-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 w-16" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** QDII 估值页骨架（每行含实时估值条） */
export function QDIIValuationRowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between p-3">
            <div>
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-1 h-4 w-32" />
            </div>
            <div className="text-right">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ==================== 通用 ==================== */

/** SectionTitle 骨架（与真实 SectionTitle 同高） */
export function SectionTitleSkeleton({ className }: { className?: string }) {
  return <Skeleton className={`mb-3 h-5 w-24 md:mb-4 md:h-6 ${className ?? ""}`} />;
}

/** 通用文本行骨架组合（用于 footer 之类的纯文本占位） */
export function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

/** 移动端基金对比骨架：顶栏 + 标签条 + 卡片占位 */
export function MobileCompareLayoutSkeleton() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 h-12 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-full items-center gap-2 px-2">
          <Skeleton className="size-9" />
          <Skeleton className="h-4 w-20" />
        </div>
      </header>
      {/* Chip 条 */}
      <div className="flex gap-2 border-b p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24" />
        ))}
      </div>
      {/* Tab 栏 */}
      <div className="flex gap-1 border-b p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {/* 主内容 */}
      <main className="flex-1 space-y-3 p-3">
        <Card>
          <CardContent className="space-y-3 p-3">
            <Skeleton className="h-4 w-1/3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-3">
            <Skeleton className="h-48 w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

/** 已选基金标签骨架（与 Badges 同形） */
export function SelectedBadgesSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-24" />
      ))}
    </div>
  );
}
