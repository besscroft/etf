import type { Route } from "./+types/fund.$code";
import { useLoaderData, useParams } from "react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { FadeIn, StaggerContainer, StaggerItem } from "~/components/motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Trophy,
  LineChart,
  History,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  getFundBasicData,
  getFundHeavyData,
  peekFundBasicStatus,
  type FundBasicData,
  type FundHeavyData,
} from "~/lib/market-data";
import { ShareExport } from "~/components/share-export";
import { AppHeader } from "~/components/app-header";
import { Breadcrumb } from "~/components/ui/breadcrumb";
import { AsyncSection } from "~/components/ui/async-section";
import { FundDetailHeavySkeleton } from "~/components/ui/skeletons";
import { Skeleton } from "~/components/ui/skeleton";
import { buildMeta } from "~/lib/seo";
import { FundNavTrendChart, HoldingsPieChart } from "~/components/charts";
import { HoldingsTable } from "~/components/stock/holdings-table";

export function meta({ data, params }: Route.MetaArgs) {
  // 同步从 loader 拿缓存命中状态，给不同情况发不同 SEO 默认值
  // - "ok" / "unknown"：用 code 占位（客户端 useEffect 拿到真实数据后会动态覆盖 title/description）
  // - "degraded"：服务端没数据，给"实时数据获取中"占位（不带具体字段名关键词，避免误导）
  // - "notFound"：API 确认基金不存在，加 noindex 避免污染搜索索引
  const code = params.code;
  const status = data?.basicStatus ?? "unknown";

  if (status === "notFound") {
    return buildMeta({
      title: "基金不存在",
      description: `基金代码 ${code} 不存在或已下架。`,
      path: `/fund/${code}`,
      noindex: true,
    });
  }

  if (status === "degraded") {
    return buildMeta({
      title: `${code} 基金详情 - 实时数据获取中`,
      description: "基金数据获取中，页面使用占位信息。完整数据加载完成后会自动恢复。",
      path: `/fund/${code}`,
    });
  }

  return buildMeta({
    title: `基金 ${code} - ETF 基金详情`,
    description: `基金代码 ${code} 的费率、规模、最新净值、昨日涨跌、净值走势、月度收益、重仓股等详情。`,
    path: `/fund/${code}`,
    type: "article",
  });
}

export async function loader({ params }: Route.LoaderArgs) {
  // 全部 defer：basic 和 heavy 都不 await → loader 同步返回，shell 立即出来
  // 5min 缓存 + 4.5s 单源短超时仍在 getFundBasicData / getFundHeavyData 内部处理
  // - dev 3s / prod 6s SSR 超时不再阻塞（loader 不 await）
  // - 404 在 client 端判断 basic === null 渲染（HTTP 仍是 200，SEO 折中）
  // - basicStatus 同步从缓存读（首次访问 = "unknown"），给 meta() 区分 SEO 默认值用
  // - degraded 状态由上游 FundDetailWithRetry 处理：先保持 skeleton 再后台重试 3 次
  return {
    basic: getFundBasicData(params.code),
    heavy: getFundHeavyData(params.code),
    basicStatus: peekFundBasicStatus(params.code),
  };
}

export default function FundDetail() {
  const { basic, heavy } = useLoaderData<typeof loader>();
  // 客户端从 URL 拿 code，用于 404 视图（basic 失败时拿不到 fund.code）
  const { code: urlCode } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="基金详情" />
      <main className="container mx-auto max-w-4xl px-3 py-6 sm:px-4">
        {/* 整页内容走 defer：basic 到达前显示骨架；basic 失败（null）显示 404 视图；degraded 走 FundDetailWithRetry 后台重试 */}
        <AsyncSection resolve={basic} fallback={<FundDetailPageSkeleton />}>
          {(b) => {
            const basicData = b as FundBasicData | null;
            if (!basicData) {
              return <FundNotFound code={urlCode ?? ""} />;
            }
            return (
              <FundDetailWithRetry initialBasic={basicData} heavy={heavy} code={urlCode ?? ""} />
            );
          }}
        </AsyncSection>
      </main>
    </div>
  );
}

/** 整页骨架：标题 + heavy 骨架，避免 basic 拿到后跳变 */
function FundDetailPageSkeleton() {
  return (
    <>
      {/* 面包屑骨架 */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>首页</span>
        <span>/</span>
        <span>场外基金</span>
        <span>/</span>
        <Skeleton className="h-3 w-12" />
      </div>
      {/* 标题 + 操作区骨架 */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <Skeleton className="mb-2 h-7 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <FundDetailHeavySkeleton />
    </>
  );
}

/** 基金不存在视图：API 确认返回 null 时渲染（HTTP 仍是 200） */
function FundNotFound({ code }: { code: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="size-6 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">基金不存在</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        基金代码 {code || "未知"}不存在或已下架。
      </p>
      <a
        href="/"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        返回首页
      </a>
    </div>
  );
}

/**
 * basic 数据可用但降级时的容器
 *
 * 触发场景：服务端/客户端首次 fetch 拿到的 basic.name === basic.code（占位数据）。
 * 这意味着双源（东方财富 datacenter + 天天基金 HTML）都失败了，SSR 阶段走 degraded
 * 兜底让页面不崩。但用户体验上：展示「占位信息」会让用户误以为基金就叫这串数字。
 *
 * 处理策略：
 * 1. 保持整页骨架（FundDetailPageSkeleton），不让 degraded 数据污染用户视觉
 * 2. 后台每 2s 重试一次（bypassCache=true），最多 3 次
 * 3. 任一次重试拿到真实数据 → 切回 FundDetailContent 正常渲染
 * 4. 重试用尽 → 切到 FundDataFailed 占位（N/A + 暂无数据 + 手动刷新按钮）
 *
 * 为什么不让 FundDetailContent 直接渲染 degraded 数据 + DegradedNotice：
 * 用户明确要求「保持 skeleton」，且 degraded 数据（name=code、price=0）放在 SEO/UI
 * 上都容易误导。直接用骨架覆盖，等价于「这次请求没成功」的诚实表达。
 */
const FUND_RETRY_MAX = 3;
const FUND_RETRY_DELAY_MS = 2000;

function FundDetailWithRetry({
  initialBasic,
  heavy,
  code,
}: {
  initialBasic: FundBasicData;
  heavy: Promise<FundHeavyData>;
  code: string;
}) {
  const initiallyDegraded = initialBasic.name === initialBasic.code;

  const [data, setData] = useState<FundBasicData>(initialBasic);
  // 初始就是 degraded 的话立刻进入重试态；否则保持正常渲染
  const [retrying, setRetrying] = useState(initiallyDegraded);
  const [retryCount, setRetryCount] = useState(0);
  const [givenUp, setGivenUp] = useState(false);

  useEffect(() => {
    if (!retrying) return;
    if (retryCount >= FUND_RETRY_MAX) {
      setGivenUp(true);
      setRetrying(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const fresh = await getFundBasicData(code, { bypassCache: true });
        if (cancelled) return;
        if (fresh && fresh.name !== fresh.code) {
          setData(fresh);
          setRetrying(false);
          return;
        }
      } catch {
        // fetch 抛异常（极少：bypassCache 路径下 fetch 内部已经 try/catch 降级）
      }
      if (cancelled) return;
      setRetryCount((c) => c + 1);
    }, FUND_RETRY_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [retrying, retryCount, code]);

  if (givenUp) {
    return <FundDataFailed code={code} />;
  }

  if (retrying) {
    return <FundDetailPageSkeleton />;
  }

  return <FundDetailContent basic={data} heavy={heavy} />;
}

/**
 * 重试 3 次后仍拿不到数据时的兜底视图
 *
 * 区别于 FundNotFound：这里是「基金确实存在但服务端一直拉不到数据」，不是 404。
 * 不加 noindex（meta() 已经在 degraded 状态给了"实时数据获取中"占位 title，不影响 SEO）。
 * 提供「刷新页面」按钮兜底用户主动重试入口。
 */
function FundDataFailed({ code }: { code: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="size-6 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">数据获取失败</h2>
      <p className="mb-1 text-sm text-muted-foreground">
        基金代码 {code || "未知"} 的数据暂时无法获取。
      </p>
      <p className="mb-6 text-xs text-muted-foreground">
        已自动重试 {FUND_RETRY_MAX} 次仍未恢复，请稍后再试或刷新页面。
      </p>
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        刷新页面
      </button>
    </div>
  );
}

/** basic 拿到后的内容壳：含 useEffect 动态 title */
function FundDetailContent({
  basic,
  heavy,
}: {
  basic: FundBasicData;
  heavy: Promise<FundHeavyData>;
}) {
  // 客户端动态 title + meta description（覆盖 meta() 的 code 占位）
  // 上游 FundDetailWithRetry 已过滤 degraded 数据，理论上 basic.name !== basic.code
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (basic.name === basic.code) return;
    document.title = `${basic.name}（${basic.code}）- ETF 基金详情`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        `${basic.name}（${basic.code}）详情：费率${basic.fee}，规模${basic.scale}，` +
          `最新净值${basic.price}，昨日涨跌${basic.changePercent}%。` +
          `净值走势、月度收益、重仓股实时行情一站查看。`,
      );
    }
  }, [basic]);

  return (
    <>
      <Breadcrumb
        items={[
          { name: "首页", path: "/" },
          { name: "场外基金", path: "/otc-funds" },
          { name: basic.name },
        ]}
      />

      <FadeIn className="mb-6 flex items-end justify-between" delay={0.1}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold md:text-3xl">{basic.name}</h1>
            <Badge variant="secondary" className="font-mono">
              {basic.code}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">场外基金</p>
        </div>
        <ShareExport
          module="fund-detail"
          data={{ fund: basic } as never}
          fileName={`fund-${basic.code}`}
        />
      </FadeIn>

      {/* 重数据区依然走 defer + Skeleton；不阻塞页面其余内容 */}
      <AsyncSection resolve={heavy} fallback={<FundDetailHeavySkeleton />}>
        {(h) => <FundHeavyContent heavy={h as FundHeavyData} basic={basic} />}
      </AsyncSection>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        数据仅供参考，不构成投资建议。
      </p>
    </>
  );
}

/**
 * 基金重数据区：业绩走势 / 历史业绩 / 重仓股 / 历史净值 / 基金信息
 * 仅在 heavy 数据到达后渲染
 */
function FundHeavyContent({ heavy, basic }: { heavy: FundHeavyData; basic: FundBasicData }) {
  return (
    <div className="bg-background p-2">
      {/* 核心指标卡片（补上 heavy 里可能更准的 performance / 实时估值等） */}
      <StaggerContainer
        className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
        stagger={0.08}
      >
        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
              <span className="text-xs text-muted-foreground">最新净值</span>
              <span className="text-2xl font-bold">{basic.price || "—"}</span>
              <span className="flex items-center gap-1 text-xs">
                {basic.changePercent > 0 ? (
                  <TrendingUp className="size-3 text-red-500" />
                ) : basic.changePercent < 0 ? (
                  <TrendingDown className="size-3 text-emerald-500" />
                ) : (
                  <Activity className="size-3 text-muted-foreground" />
                )}
                <span
                  className={
                    basic.changePercent > 0
                      ? "text-red-500"
                      : basic.changePercent < 0
                        ? "text-emerald-500"
                        : "text-muted-foreground"
                  }
                >
                  {basic.changePercent > 0 ? "+" : ""}
                  {basic.changePercent}%
                </span>
              </span>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
              <span className="text-xs text-muted-foreground">近1年收益</span>
              <span
                className={`text-2xl font-bold ${
                  (heavy.performance.oneYear ?? 0) >= 0 ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {heavy.performance.oneYear !== null
                  ? `${heavy.performance.oneYear > 0 ? "+" : ""}${heavy.performance.oneYear}%`
                  : "—"}
              </span>
              <span className="text-xs text-muted-foreground">阶段涨幅</span>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
              <span className="text-xs text-muted-foreground">基金规模</span>
              <span className="text-2xl font-bold">{basic.scale}</span>
              <span className="text-xs text-muted-foreground">管理规模</span>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
              <span className="text-xs text-muted-foreground">管理费率</span>
              <span className="text-2xl font-bold">{basic.fee}</span>
              <span className="text-xs text-muted-foreground">年费率</span>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* ====== 业绩走势 ====== */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <LineChart className="size-4 text-blue-500" />
            业绩走势
          </CardTitle>
        </CardHeader>
        <CardContent>
          {heavy.navTrend.length > 0 ? (
            <NavTrendSection data={heavy.navTrend} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">暂无业绩走势数据</p>
          )}
        </CardContent>
      </Card>

      {/* ====== 历史业绩 ====== */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Trophy className="size-4 text-amber-500" />
            历史业绩
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PerformanceCard label="近1月" value={heavy.performance.oneMonth} />
            <PerformanceCard label="近3月" value={heavy.performance.threeMonth} />
            <PerformanceCard label="近6月" value={heavy.performance.sixMonth} />
            <PerformanceCard label="近1年" value={heavy.performance.oneYear} />
          </div>
        </CardContent>
      </Card>

      {/* ====== 持仓股票 ====== */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Users className="size-4 text-primary" />
            持仓股票
          </CardTitle>
        </CardHeader>
        <CardContent>
          {heavy.topHoldings.length > 0 ? (
            <div className="space-y-4">
              <HoldingsPieChart holdings={heavy.topHoldings} />
              <HoldingsTable
                holdings={heavy.topHoldings}
                total={heavy.holdingsTotal || heavy.topHoldings.length}
                initialVisible={10}
                pageSize={50}
              />
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">暂无持仓数据</p>
          )}
        </CardContent>
      </Card>

      {/* ====== 历史净值 ====== */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <History className="size-4 text-teal-500" />
            历史净值
          </CardTitle>
        </CardHeader>
        <CardContent>
          {heavy.navHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">日期</th>
                    <th className="pb-2 text-right font-medium">单位净值</th>
                    <th className="pb-2 text-right font-medium">累计净值</th>
                    <th className="pb-2 text-right font-medium">日增长率</th>
                  </tr>
                </thead>
                <tbody>
                  {heavy.navHistory.map((row) => {
                    const growth = parseFloat(row.dailyGrowth);
                    return (
                      <tr key={row.date} className="border-b last:border-0">
                        <td className="py-2 text-xs">{row.date}</td>
                        <td className="py-2 text-right">{row.nav}</td>
                        <td className="py-2 text-right">{row.accNav}</td>
                        <td className="py-2 text-right">
                          <span
                            className={
                              growth > 0
                                ? "text-red-500"
                                : growth < 0
                                  ? "text-emerald-500"
                                  : "text-muted-foreground"
                            }
                          >
                            {isNaN(growth) ? "—" : `${growth > 0 ? "+" : ""}${row.dailyGrowth}%`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">暂无历史净值数据</p>
          )}
        </CardContent>
      </Card>

      {/* 基金信息 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm md:text-base">基金信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <InfoRow label="基金代码" value={basic.code} />
            <InfoRow label="基金名称" value={basic.name} />
            <InfoRow label="最新净值" value={`${basic.price}`} />
            <InfoRow
              label="昨日涨跌"
              value={`${basic.changePercent > 0 ? "+" : ""}${basic.changePercent}%`}
            />
            <InfoRow label="基金规模" value={basic.scale} />
            <InfoRow label="管理费率" value={basic.fee} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** 业绩走势区域（ECharts） */
function NavTrendSection({
  data,
}: {
  data: Array<{ date: string; nav: number; dailyReturn: number }>;
}) {
  return <FundNavTrendChart data={data} height={240} />;
}

/** 阶段涨幅卡片 */
function PerformanceCard({ label, value }: { label: string; value: number | null }) {
  const display = value !== null ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%` : "—";
  const color =
    value === null
      ? "text-muted-foreground"
      : value > 0
        ? "text-red-500"
        : value < 0
          ? "text-emerald-500"
          : "text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{display}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:flex-col sm:items-start sm:gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
