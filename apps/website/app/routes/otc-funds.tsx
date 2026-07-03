import type { Route } from "./+types/otc-funds";
import { Await, useLoaderData, useSearchParams } from "react-router";
import { Suspense, useMemo, useCallback } from "react";
import { Search, BarChart3, Activity } from "lucide-react";
import { buildMeta } from "~/lib/seo";
import {
  getAllOTCFundData,
  getFundCompareData,
  type FundDetailData,
  type OTCCategory,
} from "~/lib/market-data";
import { ShareExport } from "~/components/share-export";
import { useIsMobile } from "~/hooks/use-media-query";
import { MobileCompareLayout } from "~/components/compare-mobile";
import { MAX_COMPARE } from "~/components/compare-mobile/constants";
import { AppHeader } from "~/components/app-header";
import { Card, CardContent } from "~/components/ui/card";
import {
  FundCompareGridSkeleton,
  MobileCompareLayoutSkeleton,
  OTCFundsDesktopSkeleton,
} from "~/components/ui/skeletons";
import {
  CategoryChips,
  CustomFundListCard,
  FundSearchSection,
  MetricsCompare,
  NavTrendOverlay,
  PerformanceComparison,
  SectionHeader,
} from "~/components/otc";
import { useCustomOTCFundsHydration, useCustomOTCFundsStore } from "~/stores/custom-otc-funds";

export function meta() {
  return buildMeta({
    title: "场外基金对比",
    description:
      "多只场外基金对比：覆盖股票型/混合型/指数型/债券型/QDII/FOF，净值趋势、阶段收益、费率、风险并排展示",
    path: "/otc-funds",
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fundsParam = url.searchParams.get("funds") ?? "";
  const codes = fundsParam
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  // 返回未 await 的 Promise：搜索下拉、已选标签、对比主体各自流式进入。
  return {
    fundList: getAllOTCFundData(),
    fundDetails:
      codes.length > 0
        ? getFundCompareData(codes)
        : Promise.resolve([] as Array<FundDetailData & { error?: string }>),
  };
}

export default function OTCFunds() {
  const { fundList, fundDetails } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  useCustomOTCFundsHydration();
  const customFunds = useCustomOTCFundsStore((state) => state.funds);

  // 分类过滤器（URL 同步）
  const activeCategory = (searchParams.get("category") ?? "all") as OTCCategory | "all";

  // 已选基金代码（来自 URL，不依赖数据）
  const selectedCodes = useMemo(
    () =>
      (searchParams.get("funds") ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [searchParams],
  );

  // 切换分类
  const setCategory = useCallback(
    (cat: OTCCategory | "all") => {
      if (cat === "all") {
        searchParams.delete("category");
      } else {
        searchParams.set("category", cat);
      }
      setSearchParams(searchParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // 添加基金
  const addFund = useCallback(
    (code: string) => {
      if (selectedCodes.includes(code) || selectedCodes.length >= MAX_COMPARE) return;
      const newCodes = [...selectedCodes, code];
      const newParams = new URLSearchParams(searchParams);
      newParams.set("funds", newCodes.join(","));
      setSearchParams(newParams);
    },
    [selectedCodes, searchParams, setSearchParams],
  );

  // 移除基金
  const removeFund = useCallback(
    (code: string) => {
      const newCodes = selectedCodes.filter((c) => c !== code);
      const newParams = new URLSearchParams(searchParams);
      if (newCodes.length > 0) {
        newParams.set("funds", newCodes.join(","));
      } else {
        newParams.delete("funds");
      }
      setSearchParams(newParams);
    },
    [selectedCodes, searchParams, setSearchParams],
  );

  // 置顶：将指定基金移到 funds 参数首位
  const pinFund = useCallback(
    (code: string) => {
      if (!selectedCodes.includes(code)) return;
      const others = selectedCodes.filter((c) => c !== code);
      const newCodes = [code, ...others];
      const newParams = new URLSearchParams(searchParams);
      newParams.set("funds", newCodes.join(","));
      setSearchParams(newParams);
    },
    [selectedCodes, searchParams, setSearchParams],
  );

  const reachedLimit = selectedCodes.length >= MAX_COMPARE;

  // 移动端：走 MobileCompareLayout
  if (isMobile) {
    return (
      <Suspense fallback={<MobileCompareLayoutSkeleton />}>
        <Await resolve={Promise.all([fundList, fundDetails])}>
          {([list, details]) => (
            <MobileCompareLayout
              title="场外基金对比"
              funds={details}
              fundList={list.map((f) => ({
                code: f.code,
                name: f.name,
                categoryLabel: undefined,
                custom: false,
              }))}
              customFunds={customFunds}
              onAdd={addFund}
              onRemove={removeFund}
              onPin={pinFund}
              onAddCustomFund={(code) => addFund(code)}
              detailHref={(code) => `/otc-fund?code=${code}`}
              category={activeCategory}
              onCategoryChange={setCategory}
            />
          )}
        </Await>
      </Suspense>
    );
  }

  // 桌面端：Hero + 3 段（搜索 / 自选 / 对比）+ 2 列对比网格
  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="场外基金对比" />
      <main className="container mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <Suspense fallback={<OTCFundsDesktopSkeleton />}>
          <Await resolve={Promise.all([fundList, fundDetails])}>
            {([list, details]) => (
              <div className="space-y-6">
                {/* Hero 区 */}
                <section>
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">场外基金对比</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    添加 2-4 只基金，多维度对比净值走势、阶段收益、费率和规模
                  </p>
                </section>

                {/* 段 1：选择基金（SectionHeader + 复合 Card） */}
                <section className="space-y-3">
                  <SectionHeader
                    icon={Search}
                    title="选择基金"
                    description="按分类筛选后搜索代码或名称，最多选 4 只"
                    right={<CategoryChips active={activeCategory} onChange={setCategory} />}
                  />
                  <FundSearchSection
                    activeCategory={activeCategory}
                    fundList={list}
                    customFunds={customFunds}
                    fundDetails={details}
                    selectedCodes={selectedCodes}
                    onAdd={addFund}
                    onRemove={removeFund}
                  />
                </section>

                {/* 段 2：自选基金（SectionHeader + 列表） */}
                <CustomFundListCard
                  activeCategory={activeCategory}
                  selectedCodes={selectedCodes}
                  reachedLimit={reachedLimit}
                  onAdd={addFund}
                />

                {/* 段 3：对比内容（≥ 2 只时显示） */}
                {selectedCodes.length >= 2 && (
                  <div data-exclude-from-export="true" className="flex justify-end">
                    <ShareExport
                      module="fund-compare"
                      data={{ funds: details }}
                      fileName="otc-fund-compare"
                    />
                  </div>
                )}
                {selectedCodes.length >= 2 ? (
                  <Suspense fallback={<FundCompareGridSkeleton count={selectedCodes.length} />}>
                    <Await resolve={fundDetails}>
                      {(resolvedDetails) => (
                        <CompareSection funds={resolvedDetails} onRemove={removeFund} />
                      )}
                    </Await>
                  </Suspense>
                ) : selectedCodes.length === 1 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                      <p className="text-sm text-muted-foreground">请再选择至少 1 只基金开始对比</p>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyState />
                )}
              </div>
            )}
          </Await>
        </Suspense>
      </main>
    </div>
  );
}

/* ==================== 子组件 ==================== */

/** 对比区：2 列网格（lg 以上），指标 + 阶段收益并排，净值走势满宽 */
function CompareSection({
  funds,
  onRemove,
}: {
  funds: Array<FundDetailData & { error?: string }>;
  onRemove: (code: string) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Activity}
        title="对比分析"
        description={`已选 ${funds.length} 只基金，并排查看指标、走势与收益`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricsCompare funds={funds} onRemove={onRemove} />
        <PerformanceComparison funds={funds} detailHref={(code) => `/otc-fund?code=${code}`} />
      </div>
      <NavTrendOverlay funds={funds} detailHref={(code) => `/otc-fund?code=${code}`} />
    </div>
  );
}

/** 空状态：未选基金时展示 */
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <BarChart3 className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-base font-medium">选择基金开始对比</p>
          <p className="mt-1 text-sm text-muted-foreground">
            在上方搜索框输入代码或名称，选择 2-4 只场外基金进行多维度对比
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
