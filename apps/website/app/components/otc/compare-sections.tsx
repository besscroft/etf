/**
 * 桌面端对比内容组件
 *
 * 从 otc-funds.tsx 提取的 NavTrendOverlay / PerformanceComparison：
 * - 净值走势叠加图：3m/6m/1y/all 时间范围切换
 * - 阶段收益对比：使用 PerformanceReturnsChart
 *
 * 移动端有同款（compare-mobile/trend-chart-mobile.tsx / performance-bars-mobile.tsx），
 * 由 MobileCompareLayout 的 Tab 体系承载，桌面端走这里的实现。
 */
import { useState, useMemo } from "react";
import { LineChart, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { FundCompareChart, PerformanceReturnsChart } from "~/components/charts";
import type { FundDetailData } from "~/lib/market-data";

type TrendRange = "3m" | "6m" | "1y" | "all";

const RANGE_OPTIONS: Array<{ key: TrendRange; label: string }> = [
  { key: "3m", label: "近3月" },
  { key: "6m", label: "近6月" },
  { key: "1y", label: "近1年" },
  { key: "all", label: "全部" },
];

/** 净值走势叠加图 */
export function NavTrendOverlay({
  funds,
  detailHref,
}: {
  funds: Array<FundDetailData & { error?: string }>;
  detailHref: (code: string) => string;
}) {
  const [range, setRange] = useState<TrendRange>("1y");

  // 过滤有走势数据的基金
  const fundsWithData = useMemo(
    () => funds.filter((f) => f.navTrend && f.navTrend.length >= 2),
    [funds],
  );

  if (fundsWithData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <LineChart className="size-4 text-blue-500" />
            净值走势对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">暂无净值走势数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <LineChart className="size-4 text-blue-500" />
              净值走势对比
            </CardTitle>
            <CardDescription>归一化净值（起始点=100），直观对比走势强弱</CardDescription>
          </div>
          {/* 时间范围选择器 */}
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="时间范围">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={range === r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === r.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FundCompareChart
          funds={fundsWithData}
          defaultRange={range}
          detailHref={detailHref}
          showRangeControls={false}
        />
      </CardContent>
    </Card>
  );
}

/** 阶段收益对比 */
export function PerformanceComparison({
  funds,
  detailHref,
}: {
  funds: Array<FundDetailData & { error?: string }>;
  detailHref: (code: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <Trophy className="size-4 text-amber-500" />
          阶段收益对比
        </CardTitle>
        <CardDescription>近1月 / 3月 / 6月 / 1年 / 3年 多周期对比</CardDescription>
      </CardHeader>
      <CardContent>
        <PerformanceReturnsChart funds={funds} detailHref={detailHref} />
      </CardContent>
    </Card>
  );
}
