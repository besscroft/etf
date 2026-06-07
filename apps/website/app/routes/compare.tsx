import type { Route } from "./+types/compare";
import { useLoaderData, useSearchParams, Link } from "react-router";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  ArrowLeft,
  BarChart3,
  Search,
  X,
  Plus,
  Activity,
  LineChart,
  Trophy,
  Trash2,
} from "lucide-react";
import { getETFPremiumData, getFundCompareData, type FundDetailData } from "~/lib/market-data";

export function meta() {
  return [
    { title: "ETFVoid - 基金对比" },
    { name: "description", content: "多只ETF基金对比：净值趋势、阶段收益、费率、风险指标并排展示" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fundsParam = url.searchParams.get("funds") ?? "";
  const codes = fundsParam
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  // 并行获取基金列表和已选基金详情
  const [etfList, fundDetails] = await Promise.all([
    getETFPremiumData(),
    codes.length > 0 ? getFundCompareData(codes) : Promise.resolve([]),
  ]);

  return { etfList, fundDetails };
}

/** 对比颜色序列 */
const COMPARE_COLORS = [
  { line: "#3b82f6", fill: "rgba(59,130,246,0.1)", label: "蓝" }, // 蓝
  { line: "#ef4444", fill: "rgba(239,68,68,0.1)", label: "红" }, // 红
  { line: "#10b981", fill: "rgba(16,185,129,0.1)", label: "绿" }, // 绿
  { line: "#f59e0b", fill: "rgba(245,158,11,0.1)", label: "橙" }, // 橙
];

const MAX_COMPARE = 4;

export default function Compare() {
  const { etfList, fundDetails: initialDetails } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  // 已选基金代码列表
  const selectedCodes = useMemo(() => initialDetails.map((f) => f.code), [initialDetails]);

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

  // 搜索过滤
  const filteredEtfs = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return etfList.filter(
      (e) =>
        !selectedCodes.includes(e.code) &&
        (e.code.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)),
    );
  }, [etfList, searchQuery, selectedCodes]);

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
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
          <span className="font-medium">基金对比</span>
        </div>
      </header>

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

          {/* 搜索结果下拉 */}
          {filteredEtfs.length > 0 && (
            <div className="mt-1 max-h-60 overflow-y-auto rounded-md border bg-background shadow-md">
              {filteredEtfs.map((etf) => (
                <button
                  key={etf.code}
                  onClick={() => {
                    addFund(etf.code);
                    setSearchQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">{etf.code}</span>
                    <span className="ml-2">{etf.name}</span>
                  </span>
                  <Plus className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* 已选基金标签 */}
          {selectedCodes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {initialDetails.map((fund, idx) => (
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
                    style={{ backgroundColor: COMPARE_COLORS[idx % COMPARE_COLORS.length].line }}
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

          {selectedCodes.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              搜索并选择最多 {MAX_COMPARE} 只基金进行对比
            </p>
          )}
        </section>

        {/* 对比内容 */}
        {initialDetails.length >= 2 ? (
          <CompareContent funds={initialDetails} onRemove={removeFund} />
        ) : initialDetails.length === 1 ? (
          <p className="text-center text-sm text-muted-foreground">请再选择至少 1 只基金开始对比</p>
        ) : (
          <EmptyState />
        )}
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
              <MetricRow label="跟踪指数" values={funds.map((f) => f.index)} />
              <MetricRow
                label="当前价格"
                values={funds.map((f) => (f.price > 0 ? `${f.price}` : "—"))}
              />
              <MetricRow label="今日涨跌" values={funds.map((f) => f.changePercent)} isChange />
              <MetricRow
                label="溢价率"
                values={funds.map((f) => (f.premium !== undefined ? `${f.premium}%` : "—"))}
                highlight={(idx) => {
                  const p = funds[idx].premium;
                  return p >= 3 ? "text-red-500" : p >= 2 ? "text-amber-500" : "";
                }}
              />
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
            className += num > 0 ? " text-emerald-500" : num < 0 ? " text-red-500" : "";
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
        <OverlayChart funds={fundsWithData} range={range} />
      </CardContent>
    </Card>
  );
}

/** 叠加走势图（归一化，纯SVG） */
function OverlayChart({
  funds,
  range,
}: {
  funds: Array<FundDetailData & { error?: string }>;
  range: "3m" | "6m" | "1y" | "all";
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);

  const daysMap: Record<string, number> = { "3m": 90, "6m": 180, "1y": 365, all: Infinity };
  const days = daysMap[range];

  // 按时间范围过滤并归一化
  const seriesData = useMemo(() => {
    return funds.map((fund) => {
      let data = fund.navTrend;
      if (days !== Infinity) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        data = data.filter((d) => d.date >= cutoffStr);
      }
      if (data.length < 2) return { fund, points: [] as Array<{ date: string; value: number }> };

      // 归一化：起始点=100
      const base = data[0].nav;
      const points = data.map((d) => ({
        date: d.date,
        value: base > 0 ? (d.nav / base) * 100 : 100,
      }));

      // 采样（保留约150个点）
      const sampled =
        points.length > 150
          ? points.filter(
              (_, i) => i % Math.ceil(points.length / 150) === 0 || i === points.length - 1,
            )
          : points;

      return { fund, points: sampled };
    });
  }, [funds, days]);

  // 计算全局Y范围
  const allValues = seriesData.flatMap((s) => s.points.map((p) => p.value));
  if (allValues.length < 2) {
    return <p className="text-sm text-muted-foreground">数据不足</p>;
  }

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const valRange = maxVal - minVal || 1;

  const width = 700;
  const height = 260;
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 找出所有日期范围
  const allDates = seriesData.flatMap((s) => s.points.map((p) => p.date));
  const minDate = allDates.sort()[0];
  const maxDate = allDates.sort().slice(-1)[0];
  const dateRange =
    minDate && maxDate ? new Date(maxDate).getTime() - new Date(minDate).getTime() : 1;

  // Y轴刻度
  const yTicks = Array.from({ length: 3 }, (_, i) => {
    const val = minVal + (valRange * i) / 2;
    const y = padding.top + chartH - ((val - minVal) / valRange) * chartH;
    return { val: val.toFixed(1), y };
  });

  // X轴标签
  const firstDate = minDate?.slice(2) ?? "";
  const lastDate = maxDate?.slice(2) ?? "";
  const midIdx = Math.floor((seriesData[0]?.points.length ?? 0) / 2);
  const midDate = seriesData[0]?.points[midIdx]?.date?.slice(2) ?? "";

  // 鼠标悬浮时查找最近X位置对应的数据
  const findClosestX = (clientX: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    return (clientX - rect.left) * scaleX;
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    setHoverX(findClosestX(e.clientX, e.currentTarget));
  };

  // 悬浮竖线对应的日期
  const hoverDate = useMemo(() => {
    if (hoverX === null || !minDate || !maxDate) return null;
    const ratio = (hoverX - padding.left) / chartW;
    if (ratio < 0 || ratio > 1) return null;
    const t = new Date(minDate).getTime() + ratio * dateRange;
    return new Date(t).toISOString().split("T")[0];
  }, [hoverX, minDate, maxDate, dateRange, chartW]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto", minHeight: 160 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverX(null)}
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
        <text x={padding.left} y={height - 5} className="fill-muted-foreground" fontSize={10}>
          {firstDate}
        </text>
        <text
          x={padding.left + chartW / 2}
          y={height - 5}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {midDate}
        </text>
        <text
          x={padding.left + chartW}
          y={height - 5}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {lastDate}
        </text>

        {/* 各基金走势线 */}
        {seriesData.map((series, sIdx) => {
          if (series.points.length < 2) return null;
          const color = COMPARE_COLORS[sIdx % COMPARE_COLORS.length];

          const coords = series.points.map((p) => {
            const xRatio =
              dateRange > 0
                ? (new Date(p.date).getTime() - new Date(minDate).getTime()) / dateRange
                : 0;
            const x = padding.left + xRatio * chartW;
            const y = padding.top + chartH - ((p.value - minVal) / valRange) * chartH;
            return { x, y, ...p };
          });

          const linePath = `M${coords.map((c) => `${c.x},${c.y}`).join(" L")}`;
          const areaPath = `${linePath} L${coords[coords.length - 1].x},${padding.top + chartH} L${coords[0].x},${padding.top + chartH} Z`;

          return (
            <g key={series.fund.code}>
              <path d={areaPath} fill={color.fill} />
              <path d={linePath} fill="none" stroke={color.line} strokeWidth={2} />
            </g>
          );
        })}

        {/* 悬浮竖线 */}
        {hoverX !== null && hoverX >= padding.left && hoverX <= padding.left + chartW && (
          <line
            x1={hoverX}
            y1={padding.top}
            x2={hoverX}
            y2={padding.top + chartH}
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeDasharray="4 2"
          />
        )}
      </svg>

      {/* 悬浮数据提示 */}
      {hoverDate && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <span className="text-muted-foreground">{hoverDate}</span>
          {seriesData.map((series, sIdx) => {
            // 找到最接近hoverDate的数据点
            const closest = series.points.reduce((prev, curr) =>
              Math.abs(curr.date.localeCompare(hoverDate)) <
              Math.abs(prev.date.localeCompare(hoverDate))
                ? curr
                : prev,
            );
            const change = closest.value - 100;
            return (
              <span key={series.fund.code} className="flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: COMPARE_COLORS[sIdx % COMPARE_COLORS.length].line }}
                />
                <span>{series.fund.name}</span>
                <span className={change >= 0 ? "text-emerald-500" : "text-red-500"}>
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==================== 阶段收益对比 ==================== */

function PerformanceComparison({ funds }: { funds: Array<FundDetailData & { error?: string }> }) {
  const periods = [
    { key: "oneMonth" as const, label: "近1月" },
    { key: "threeMonth" as const, label: "近3月" },
    { key: "sixMonth" as const, label: "近6月" },
    { key: "oneYear" as const, label: "近1年" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <Trophy className="size-4 text-amber-500" />
          阶段收益对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {periods.map((period) => {
            const values = funds.map((f) => f.performance[period.key] ?? null);
            const nonNullValues = values.filter((v): v is number => v !== null);
            const maxAbs =
              nonNullValues.length > 0 ? Math.max(...nonNullValues.map(Math.abs), 1) : 1;

            return (
              <div key={period.key}>
                <div className="mb-2 text-xs font-medium text-muted-foreground">{period.label}</div>
                <div className="space-y-1.5">
                  {funds.map((fund) => {
                    const val = fund.performance[period.key];
                    const pct = val !== null ? (val / maxAbs) * 50 : 0; // 最大占50%宽度

                    return (
                      <div key={fund.code} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 truncate text-xs">{fund.name}</span>
                        <div className="relative flex-1 h-5">
                          {/* 中轴线 */}
                          <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                          {/* 条形 */}
                          {val !== null ? (
                            <div
                              className={`absolute top-0.5 h-4 rounded-sm ${
                                val >= 0 ? "bg-emerald-500/80" : "bg-red-500/80"
                              }`}
                              style={{
                                width: `${Math.abs(pct)}%`,
                                left: val >= 0 ? "50%" : `${50 - Math.abs(pct)}%`,
                              }}
                            />
                          ) : null}
                        </div>
                        <span
                          className={`w-16 shrink-0 text-right text-xs font-medium ${
                            val === null
                              ? "text-muted-foreground"
                              : val > 0
                                ? "text-emerald-500"
                                : val < 0
                                  ? "text-red-500"
                                  : ""
                          }`}
                        >
                          {val !== null ? `${val > 0 ? "+" : ""}${val.toFixed(2)}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
