import type { Route } from "./+types/compare";
import { Await, useLoaderData, useSearchParams } from "react-router";
import { Suspense, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { BarChart3, Search, X, Plus, Activity, LineChart, Trophy, Trash2 } from "lucide-react";
import { buildMeta } from "~/lib/seo";
import { getPublicOTCFundData, getFundCompareData, type FundDetailData } from "~/lib/market-data";
import { ShareExport } from "~/components/share-export";
import { useIsMobile } from "~/hooks/use-media-query";
import { MobileCompareLayout } from "~/components/compare-mobile/mobile-compare-layout";
import { COMPARE_COLORS, MAX_COMPARE } from "~/components/compare-mobile/constants";
import { AppHeader } from "~/components/app-header";
import { FundCompareChart, PerformanceReturnsChart } from "~/components/charts";
import {
  FundCompareGridSkeleton,
  SelectedBadgesSkeleton,
  MobileCompareLayoutSkeleton,
} from "~/components/ui/skeletons";

export function meta() {
  return buildMeta({
    title: "场外基金对比",
    description: "多只场外基金对比：净值趋势、阶段收益、费率、风险指标并排展示",
    path: "/cn/funds",
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fundsParam = url.searchParams.get("funds") ?? "";
  const codes = fundsParam
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  // 返回未 await 的 Promise —— 页面 chrome 立即渲染，
  // 搜索下拉、已选标签、对比主体各自流式进入。
  return {
    fundList: getPublicOTCFundData(),
    fundDetails:
      codes.length > 0
        ? getFundCompareData(codes)
        : Promise.resolve([] as Array<FundDetailData & { error?: string }>),
  };
}

export default function Compare() {
  const { fundList, fundDetails } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  // 已选基金代码（来自 URL，不依赖数据，可立即计算）
  const [searchParamsCurrent] = useSearchParams();
  const selectedCodes = useMemo(
    () =>
      (searchParamsCurrent.get("funds") ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [searchParamsCurrent],
  );

  // 添加基金
  const addFund = useCallback(
    (code: string) => {
      if (selectedCodes.includes(code) || selectedCodes.length >= MAX_COMPARE) return;
      const newCodes = [...selectedCodes, code];
      setSearchParams({ funds: newCodes.join(",") });
    },
    [selectedCodes, setSearchParams],
  );

  // 移除基金
  const removeFund = useCallback(
    (code: string) => {
      const newCodes = selectedCodes.filter((c) => c !== code);
      setSearchParams(newCodes.length > 0 ? { funds: newCodes.join(",") } : {});
    },
    [selectedCodes, setSearchParams],
  );

  // 置顶：将指定基金移到 funds 参数首位
  const pinFund = useCallback(
    (code: string) => {
      if (!selectedCodes.includes(code)) return;
      const others = selectedCodes.filter((c) => c !== code);
      const newCodes = [code, ...others];
      setSearchParams({ funds: newCodes.join(",") });
    },
    [selectedCodes, setSearchParams],
  );

  // 移动端：整个布局依赖 fundList + fundDetails，整体包 Suspense
  if (isMobile) {
    return (
      <Suspense fallback={<MobileCompareLayoutSkeleton />}>
        <Await resolve={Promise.all([fundList, fundDetails])}>
          {([list, details]) => (
            <MobileCompareLayout
              title="场外基金对比"
              funds={details}
              fundList={list}
              onAdd={addFund}
              onRemove={removeFund}
              onPin={pinFund}
            />
          )}
        </Await>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="场外基金对比" />
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {/* 搜索添加基金 */}
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">选择基金</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索基金代码或名称..."
              className="w-full rounded-md border bg-background px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              disabled={selectedCodes.length >= MAX_COMPARE}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* 搜索结果下拉：依赖 fundList，数据未到时隐藏（用户输入时也不会出现误显示） */}
          <Suspense fallback={null}>
            <Await resolve={fundList}>
              {(list) => {
                const q = searchQuery.trim().toLowerCase();
                if (!q) return null;
                const filtered = list.filter(
                  (f) =>
                    !selectedCodes.includes(f.code) &&
                    (f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)),
                );
                if (filtered.length === 0) return null;
                return (
                  <div className="mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-md">
                    {filtered.map((f) => (
                      <button
                        key={f.code}
                        onClick={() => {
                          addFund(f.code);
                          setSearchQuery("");
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <span>
                          <span className="font-mono text-xs text-muted-foreground">{f.code}</span>
                          <span className="ml-2">{f.name}</span>
                        </span>
                        <Plus className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                );
              }}
            </Await>
          </Suspense>

          {/* 已选基金标签：依赖 fundDetails 取名称，未到时显示骨架 */}
          {selectedCodes.length > 0 && (
            <Suspense fallback={<SelectedBadgesSkeleton count={selectedCodes.length} />}>
              <Await resolve={fundDetails}>
                {(details) => (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {details.map((fund, idx) => (
                      <Badge
                        key={fund.code}
                        variant="secondary"
                        className="gap-1.5 px-3 py-1.5 text-sm"
                        style={{
                          borderColor: COMPARE_COLORS[idx % COMPARE_COLORS.length].line,
                          borderWidth: 1.5,
                        }}
                      >
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{
                            backgroundColor: COMPARE_COLORS[idx % COMPARE_COLORS.length].line,
                          }}
                        />
                        {fund.name}
                        <button
                          onClick={() => removeFund(fund.code)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedCodes.length < MAX_COMPARE && (
                      <span className="flex items-center text-xs text-muted-foreground">
                        还可添加 {MAX_COMPARE - selectedCodes.length} 只
                      </span>
                    )}
                  </div>
                )}
              </Await>
            </Suspense>
          )}

          {selectedCodes.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              搜索并选择最多 {MAX_COMPARE} 只基金进行对比
            </p>
          )}
        </section>

        {/* 对比内容（可导出区域） */}
        <div className="flex items-center justify-end mb-3">
          {selectedCodes.length >= 2 && (
            <Suspense fallback={null}>
              <Await resolve={fundDetails}>
                {(details) => (
                  <ShareExport
                    module="fund-compare"
                    data={{ funds: details }}
                    fileName="fund-compare"
                  />
                )}
              </Await>
            </Suspense>
          )}
        </div>
        <div className="bg-background p-2">
          {selectedCodes.length >= 2 ? (
            <Suspense fallback={<FundCompareGridSkeleton count={selectedCodes.length} />}>
              <Await resolve={fundDetails}>
                {(details) => <CompareContent funds={details} onRemove={removeFund} />}
              </Await>
            </Suspense>
          ) : selectedCodes.length === 1 ? (
            <p className="text-center text-sm text-muted-foreground">
              请再选择至少 1 只基金开始对比
            </p>
          ) : (
            <EmptyState />
          )}
        </div>
      </main>
    </div>
  );
}

/* ==================== 空状态 ==================== */

function EmptyState() {
  return (
    <Card className="py-16">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <BarChart3 className="size-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-medium">选择基金开始对比</p>
          <p className="mt-1 text-sm text-muted-foreground">
            在上方搜索框中输入基金代码或名称，选择 2-4 只基金进行多维度对比
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==================== 对比内容主体 ==================== */

function CompareContent({
  funds,
  onRemove,
}: {
  funds: Array<FundDetailData & { error?: string }>;
  onRemove: (code: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* 核心指标对比 */}
      <MetricsComparison funds={funds} onRemove={onRemove} />
      {/* 净值走势叠加图 */}
      <NavTrendOverlay funds={funds} />
      {/* 阶段收益对比 */}
      <PerformanceComparison funds={funds} />
    </div>
  );
}

/* ==================== 核心指标对比 ==================== */

function MetricsComparison({
  funds,
  onRemove,
}: {
  funds: Array<FundDetailData & { error?: string }>;
  onRemove: (code: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <Activity className="size-4 text-primary" />
          核心指标对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">
                  指标
                </th>
                {funds.map((fund, idx) => (
                  <th key={fund.code} className="pb-2 text-center text-xs font-medium">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{
                          backgroundColor: COMPARE_COLORS[idx % COMPARE_COLORS.length].line,
                        }}
                      />
                      <span>{fund.name}</span>
                      <button
                        onClick={() => onRemove(fund.code)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <MetricRow label="基金代码" values={funds.map((f) => f.code)} />
              <MetricRow
                label="最新净值"
                values={funds.map((f) => (f.price > 0 ? `${f.price}` : "—"))}
              />
              <MetricRow label="涨跌幅" values={funds.map((f) => f.changePercent)} isChange />
              <MetricRow label="基金规模" values={funds.map((f) => f.scale)} />
              <MetricRow label="管理费率" values={funds.map((f) => f.fee)} />
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** 对比表格行 */
function MetricRow({
  label,
  values,
  isChange,
  highlight,
}: {
  label: string;
  values: Array<string | number>;
  isChange?: boolean;
  highlight?: (idx: number) => string;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">{label}</td>
      {values.map((val, idx) => {
        let className = "py-2.5 text-center";
        if (isChange) {
          const num = typeof val === "number" ? val : parseFloat(String(val));
          if (!isNaN(num)) {
            className += num > 0 ? " text-red-500" : num < 0 ? " text-emerald-500" : "";
          }
        }
        if (highlight) {
          const extra = highlight(idx);
          if (extra) className += ` ${extra}`;
        }
        return (
          <td key={idx} className={className}>
            {isChange && typeof val === "number" ? `${val > 0 ? "+" : ""}${val}%` : String(val)}
          </td>
        );
      })}
    </tr>
  );
}

/* ==================== 净值走势叠加图 ==================== */

function NavTrendOverlay({ funds }: { funds: Array<FundDetailData & { error?: string }> }) {
  const [range, setRange] = useState<"3m" | "6m" | "1y" | "all">("1y");

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
          <p className="text-center text-sm text-muted-foreground">暂无净值走势数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <LineChart className="size-4 text-blue-500" />
          净值走势对比
        </CardTitle>
        <CardDescription>归一化净值（起始点=100），直观对比走势强弱</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 时间范围选择器 */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[
            { key: "3m" as const, label: "近3月", days: 90 },
            { key: "6m" as const, label: "近6月", days: 180 },
            { key: "1y" as const, label: "近1年", days: 365 },
            { key: "all" as const, label: "全部", days: Infinity },
          ].map((r) => (
            <button
              key={r.key}
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
        <FundCompareChart
          funds={fundsWithData}
          defaultRange={range}
          detailHref={(code) => `/otc-fund?code=${code}`}
          showRangeControls={false}
        />
      </CardContent>
    </Card>
  );
}

/* ==================== 阶段收益对比 ==================== */

function PerformanceComparison({ funds }: { funds: Array<FundDetailData & { error?: string }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <Trophy className="size-4 text-amber-500" />
          阶段收益对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceReturnsChart funds={funds} detailHref={(code) => `/otc-fund?code=${code}`} />
      </CardContent>
    </Card>
  );
}
