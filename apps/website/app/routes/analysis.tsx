import type { Route } from "./+types/analysis";
import { useLoaderData, useSearchParams, Link } from "react-router";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/motion";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  LineChart,
  Trophy,
  History,
  Users,
  Gauge,
  Calendar,
} from "lucide-react";
import { getAllQDIIFundData, getFundDetailData, type FundDetailData } from "~/lib/market-data";
import { DURATION, EASING } from "~/lib/motion";

export function meta() {
  return [
    { title: "ETFVoid - 基金分析" },
    {
      name: "description",
      content: "单基金深度分析：净值走势、全周期收益、最大回撤、月度热力图与经理履历",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";

  // 并行获取基金列表和指定基金详情
  const [fundList, fundDetail] = await Promise.all([
    getAllQDIIFundData(),
    code ? getFundDetailData(code) : Promise.resolve(null),
  ]);

  return { fundList, fundDetail };
}

export default function Analysis() {
  const { fundList, fundDetail: initialDetail } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  // 搜索过滤
  const filteredFunds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return fundList.filter(
      (f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
    );
  }, [fundList, searchQuery]);

  const selectFund = (code: string) => {
    setSearchParams({ code });
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <motion.header
        className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
      >
        <div className="container mx-auto flex max-w-4xl items-center gap-3 px-3 py-3 sm:px-4">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="返回首页">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <BarChart3 className="size-5 text-primary" />
          <Link to="/" className="text-lg font-semibold tracking-tight hover:underline">
            ETFVoid
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">基金分析</span>
        </div>
      </motion.header>

      <main className="container mx-auto max-w-4xl px-3 py-6 sm:px-4">
        {/* 搜索选择基金 */}
        <section className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入基金代码或名称搜索..."
              className="w-full rounded-md border bg-background px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
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

          {/* 搜索结果下拉 */}
          {filteredFunds.length > 0 && (
            <div className="mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-md">
              {filteredFunds.slice(0, 20).map((f) => (
                <button
                  key={f.code}
                  onClick={() => selectFund(f.code)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">{f.code}</span>
                    <span className="ml-2">{f.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{f.categoryLabel}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 分析内容 */}
        {initialDetail ? <AnalysisContent fund={initialDetail} /> : <EmptyState />}
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
          <p className="text-lg font-medium">选择基金开始分析</p>
          <p className="mt-1 text-sm text-muted-foreground">
            在上方搜索框中输入基金代码或名称，查看深度分析报告
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ==================== 分析内容主体 ==================== */

function AnalysisContent({ fund }: { fund: FundDetailData }) {
  return (
    <div className="space-y-6">
      {/* 基金标题 */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">{fund.name}</h1>
          <Badge variant="secondary" className="font-mono">
            {fund.code}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">场外基金</p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-xs text-muted-foreground">最新净值</span>
            <span className="text-2xl font-bold">{fund.price || "—"}</span>
            <span className="flex items-center gap-1 text-xs">
              {fund.changePercent > 0 ? (
                <TrendingUp className="size-3 text-red-500" />
              ) : fund.changePercent < 0 ? (
                <TrendingDown className="size-3 text-emerald-500" />
              ) : (
                <Activity className="size-3 text-muted-foreground" />
              )}
              <span
                className={
                  fund.changePercent > 0
                    ? "text-red-500"
                    : fund.changePercent < 0
                      ? "text-emerald-500"
                      : ""
                }
              >
                {fund.changePercent > 0 ? "+" : ""}
                {fund.changePercent}%
              </span>
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-xs text-muted-foreground">近1年收益</span>
            <span
              className={`text-2xl font-bold ${(fund.performance.oneYear ?? 0) >= 0 ? "text-red-500" : "text-emerald-500"}`}
            >
              {fund.performance.oneYear !== null
                ? `${fund.performance.oneYear > 0 ? "+" : ""}${fund.performance.oneYear}%`
                : "—"}
            </span>
            <span className="text-xs text-muted-foreground">阶段涨幅</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-xs text-muted-foreground">最大回撤</span>
            <span className="text-2xl font-bold text-red-500">
              {fund.maxDrawdown !== null ? `${fund.maxDrawdown}%` : "—"}
            </span>
            <span className="text-xs text-muted-foreground">历史最大</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
            <span className="text-xs text-muted-foreground">基金规模</span>
            <span className="text-2xl font-bold">{fund.scale}</span>
            <span className="text-xs text-muted-foreground">管理规模</span>
          </CardContent>
        </Card>
      </div>

      {/* 净值走势 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <LineChart className="size-4 text-blue-500" />
            净值走势
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fund.navTrend.length > 1 ? (
            <NavTrendChart data={fund.navTrend} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">暂无净值走势数据</p>
          )}
        </CardContent>
      </Card>

      {/* 全周期收益 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Trophy className="size-4 text-amber-500" />
            全周期收益
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PerformanceCard label="近1月" value={fund.performance.oneMonth} />
            <PerformanceCard label="近3月" value={fund.performance.threeMonth} />
            <PerformanceCard label="近6月" value={fund.performance.sixMonth} />
            <PerformanceCard label="近1年" value={fund.performance.oneYear} />
            <PerformanceCard label="近3年" value={fund.performance.threeYear} />
            <PerformanceCard label="成立来" value={fund.performance.sinceInception} />
          </div>
        </CardContent>
      </Card>

      {/* 月度收益热力图 */}
      {fund.monthlyReturns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Calendar className="size-4 text-purple-500" />
              月度收益热力图
            </CardTitle>
            <CardDescription>每月收益率分布，绿色为正收益，红色为负收益</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyHeatmap data={fund.monthlyReturns} />
          </CardContent>
        </Card>
      )}

      {/* 基金经理 */}
      {fund.managers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Users className="size-4 text-indigo-500" />
              基金经理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fund.managers.map((mgr) => (
                <div
                  key={mgr.name}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <span className="font-medium">{mgr.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      任职日期：{mgr.tenure}
                    </span>
                  </div>
                  {mgr.tenureReturn !== null && (
                    <span
                      className={`text-sm font-medium ${mgr.tenureReturn >= 0 ? "text-red-500" : "text-emerald-500"}`}
                    >
                      任职回报 {mgr.tenureReturn > 0 ? "+" : ""}
                      {mgr.tenureReturn.toFixed(2)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 重仓股 */}
      {fund.topHoldings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Gauge className="size-4 text-orange-500" />
              重仓股行情
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">代码</th>
                    <th className="pb-2 text-left font-medium">名称</th>
                    <th className="pb-2 text-right font-medium">持仓占比</th>
                    <th className="pb-2 text-right font-medium">最新价</th>
                    <th className="pb-2 text-right font-medium">涨跌幅</th>
                  </tr>
                </thead>
                <tbody>
                  {fund.topHoldings.map((stock) => (
                    <tr key={stock.symbol} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{stock.symbol}</td>
                      <td className="py-2">{stock.name}</td>
                      <td className="py-2 text-right">
                        {stock.holdingRatio > 0 ? (
                          <span className="font-medium">{stock.holdingRatio.toFixed(2)}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {stock.price > 0 ? `$${stock.price.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={
                            stock.changePercent > 0
                              ? "text-red-500"
                              : stock.changePercent < 0
                                ? "text-emerald-500"
                                : ""
                          }
                        >
                          {stock.changePercent > 0 ? "+" : ""}
                          {stock.changePercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 历史净值 */}
      {fund.navHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <History className="size-4 text-teal-500" />
              历史净值
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  {fund.navHistory.map((row) => {
                    const growth = parseFloat(row.dailyGrowth);
                    return (
                      <tr key={row.date} className="border-b last:border-0">
                        <td className="py-2 text-xs">{row.date}</td>
                        <td className="py-2 text-right">{row.nav}</td>
                        <td className="py-2 text-right">{row.accNav}</td>
                        <td className="py-2 text-right">
                          <span
                            className={
                              growth > 0 ? "text-red-500" : growth < 0 ? "text-emerald-500" : ""
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
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">数据仅供参考，不构成投资建议。</p>
    </div>
  );
}

/* ==================== 业绩卡片 ==================== */

function PerformanceCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-lg font-bold ${value === null ? "" : value > 0 ? "text-red-500" : value < 0 ? "text-emerald-500" : ""}`}
      >
        {value !== null ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%` : "—"}
      </div>
    </div>
  );
}

/* ==================== 净值走势图 ==================== */

type TimeRange = "1m" | "3m" | "6m" | "1y" | "3y" | "all";

const TIME_RANGES: Array<{ key: TimeRange; label: string; days: number }> = [
  { key: "1m", label: "近1月", days: 30 },
  { key: "3m", label: "近3月", days: 90 },
  { key: "6m", label: "近6月", days: 180 },
  { key: "1y", label: "近1年", days: 365 },
  { key: "3y", label: "近3年", days: 1095 },
  { key: "all", label: "成立来", days: Infinity },
];

function NavTrendChart({ data }: { data: Array<{ date: string; nav: number }> }) {
  const [range, setRange] = useState<TimeRange>("1y");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (range === "all") return data;
    const config = TIME_RANGES.find((r) => r.key === range);
    if (!config) return data;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.filter((d) => d.date >= cutoffStr);
  }, [data, range]);

  if (filtered.length < 2) return <p className="text-sm text-muted-foreground">数据不足</p>;

  // 采样
  const recent =
    filtered.length > 200
      ? filtered.filter(
          (_, i) => i % Math.ceil(filtered.length / 200) === 0 || i === filtered.length - 1,
        )
      : filtered;

  const navs = recent.map((d) => d.nav);
  const minNav = Math.min(...navs);
  const maxNav = Math.max(...navs);
  const navRange = maxNav - minNav || 1;

  const width = 700;
  const height = 240;
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const coords = recent.map((d, i) => ({
    x: padding.left + (i / (recent.length - 1)) * chartW,
    y: padding.top + chartH - ((d.nav - minNav) / navRange) * chartH,
    ...d,
  }));

  const points = coords.map((c) => `${c.x},${c.y}`);
  const areaPath = `M${points[0]} L${points.slice(1).join(" L")} L${padding.left + chartW},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;
  const linePath = `M${points[0]} L${points.slice(1).join(" L")}`;

  const isUp = navs[navs.length - 1] >= navs[0];
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = isUp ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";

  const yTicks = Array.from({ length: 3 }, (_, i) => {
    const val = minNav + (navRange * i) / 2;
    const y = padding.top + chartH - ((val - minNav) / navRange) * chartH;
    return { val: val.toFixed(2), y };
  });

  const firstYear = recent[0].date.slice(0, 4);
  const lastYear = recent[recent.length - 1].date.slice(0, 4);
  const crossYear = firstYear !== lastYear;
  const fmtDate = (d: string) => (crossYear ? d.slice(2) : d.slice(5));
  const xLabels = [
    { text: fmtDate(recent[0].date), x: padding.left },
    { text: fmtDate(recent[Math.floor(recent.length / 2)].date), x: padding.left + chartW / 2 },
    { text: fmtDate(recent[recent.length - 1].date), x: padding.left + chartW },
  ];

  const activeIdx = hoverIdx ?? selectedIdx;
  const active = activeIdx !== null ? coords[activeIdx] : null;
  const firstNav = navs[0];
  const activeChange = active && firstNav > 0 ? ((active.nav - firstNav) / firstNav) * 100 : null;

  const findClosest = (clientX: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const pointerX = (clientX - rect.left) * scaleX;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - pointerX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    return closest;
  };

  return (
    <div>
      {/* 时间范围选择器 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TIME_RANGES.map((r) => (
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

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto", minHeight: 160 }}
        onPointerMove={(e) => setHoverIdx(findClosest(e.clientX, e.currentTarget))}
        onPointerLeave={() => setHoverIdx(null)}
        onClick={(e) => setSelectedIdx(findClosest(e.clientX, e.currentTarget))}
      >
        {/* Y轴刻度 */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={padding.left + chartW}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <text
              x={padding.left - 5}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* X轴标签 */}
        {xLabels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={height - 5}
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
            className="fill-muted-foreground"
            fontSize={10}
          >
            {label.text}
          </text>
        ))}

        {/* 面积填充 */}
        <path d={areaPath} fill={fillColor} />
        {/* 折线 */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* 悬浮竖线和数据点 */}
        {active && (
          <>
            <line
              x1={active.x}
              y1={padding.top}
              x2={active.x}
              y2={padding.top + chartH}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeDasharray="4 2"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4}
              fill={lineColor}
              stroke="white"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {/* 悬浮数据提示 */}
      {active && (
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{active.date}</span>
          <span>
            净值 <span className="font-medium">{active.nav.toFixed(4)}</span>
          </span>
          {activeChange !== null && (
            <span className={activeChange >= 0 ? "text-red-500" : "text-emerald-500"}>
              区间 {activeChange >= 0 ? "+" : ""}
              {activeChange.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== 月度收益热力图 ==================== */

function MonthlyHeatmap({
  data,
}: {
  data: Array<{ year: number; month: number; returnRate: number }>;
}) {
  // 获取年份范围（最近5年）
  const years = useMemo(() => {
    const allYears = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
    return allYears.slice(-5);
  }, [data]);

  // 构建查找Map
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(`${d.year}-${d.month}`, d.returnRate);
    }
    return map;
  }, [data]);

  const months = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];

  // 颜色映射
  const getCellColor = (rate: number | undefined): string => {
    if (rate === undefined) return "bg-muted/50";
    if (rate >= 5) return "bg-red-500";
    if (rate >= 3) return "bg-red-400";
    if (rate >= 1) return "bg-red-300/70";
    if (rate >= 0) return "bg-red-200/50";
    if (rate >= -1) return "bg-emerald-200/50";
    if (rate >= -3) return "bg-emerald-300/70";
    if (rate >= -5) return "bg-emerald-400";
    return "bg-emerald-500";
  };

  const getCellTextColor = (rate: number | undefined): string => {
    if (rate === undefined) return "text-muted-foreground";
    if (Math.abs(rate) >= 3) return "text-white";
    return "text-foreground";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="pb-1.5 pr-2 text-left font-medium text-muted-foreground">年份</th>
            {months.map((m) => (
              <th key={m} className="pb-1.5 text-center font-medium text-muted-foreground">
                {m}
              </th>
            ))}
            <th className="pb-1.5 pl-2 text-right font-medium text-muted-foreground">年度</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => {
            // 计算年度收益
            const yearData = data.filter((d) => d.year === year);
            const yearReturn =
              yearData.length > 0
                ? yearData.reduce((acc, d) => acc * (1 + d.returnRate / 100), 1) - 1
                : undefined;

            return (
              <tr key={year}>
                <td className="py-0.5 pr-2 font-medium">{year}</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const rate = dataMap.get(`${year}-${month}`);
                  return (
                    <td key={month} className="py-0.5 px-0.5">
                      <div
                        className={`flex h-7 items-center justify-center rounded-sm ${getCellColor(rate)} ${getCellTextColor(rate)}`}
                        title={`${year}年${month}月: ${rate !== undefined ? `${rate > 0 ? "+" : ""}${rate.toFixed(2)}%` : "—"}`}
                      >
                        {rate !== undefined ? (rate > 0 ? "+" : "") + rate.toFixed(1) : "—"}
                      </div>
                    </td>
                  );
                })}
                <td
                  className={`py-0.5 pl-2 text-right font-medium ${yearReturn !== undefined ? (yearReturn >= 0 ? "text-red-500" : "text-emerald-500") : ""}`}
                >
                  {yearReturn !== undefined
                    ? `${yearReturn >= 0 ? "+" : ""}${(yearReturn * 100).toFixed(2)}%`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
