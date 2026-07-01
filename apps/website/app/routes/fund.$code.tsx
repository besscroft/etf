import type { Route } from "./+types/fund.$code";
import { useLoaderData } from "react-router";
import { useState, useMemo } from "react";
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
} from "lucide-react";
import { getFundDetailData } from "~/lib/market-data";
import { ShareExport } from "~/components/share-export";
import { AppHeader } from "~/components/app-header";
import { buildMeta, buildFundJsonLd } from "~/lib/seo";

export function meta({ data }: Route.MetaArgs) {
  // 404 时 data 为 undefined，用 loader 默认值兜底
  const fund = data ?? { code: "未知", name: "基金" };
  const title = `${fund.name}（${fund.code}）`;
  const description =
    `${fund.name}（${fund.code}）详情：费率${fund.fee ?? "—"}，` +
    `规模${fund.scale ?? "—"}，` +
    `近1年收益${fund.performance?.oneYear != null ? `${fund.performance.oneYear}%` : "—"}，` +
    `近3年收益${fund.performance?.threeYear != null ? `${fund.performance.threeYear}%` : "—"}。` +
    `净值走势、月度收益、经理履历、重仓股实时行情一站查看。`;

  return buildMeta({
    title,
    description,
    path: `/fund/${fund.code}`,
    type: "article",
    extra: [buildFundJsonLd({ ...fund, path: `/fund/${fund.code}` })],
  });
}

export async function loader({ params }: Route.LoaderArgs) {
  const fund = await getFundDetailData(params.code);
  if (!fund) {
    throw new Response("基金未找到", { status: 404 });
  }
  return fund;
}

export default function FundDetail() {
  const fund = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel={fund.name} />
      <main className="container mx-auto max-w-4xl px-3 py-6 sm:px-4">
        {/* 基金标题 */}
        <FadeIn className="mb-6 flex items-end justify-between" delay={0.1}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold md:text-3xl">{fund.name}</h1>
              <Badge variant="secondary" className="font-mono">
                {fund.code}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">场外基金</p>
          </div>
          <ShareExport module="fund-detail" data={{ fund }} fileName={`fund-${fund.code}`} />
        </FadeIn>

        {/* 详情区域 */}
        <div className="bg-background p-2">
          {/* 核心指标卡片 */}
          <StaggerContainer
            className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
            stagger={0.08}
          >
            <StaggerItem>
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
                            : "text-muted-foreground"
                      }
                    >
                      {fund.changePercent > 0 ? "+" : ""}
                      {fund.changePercent}%
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
                    className={`text-2xl font-bold ${(fund.performance.oneYear ?? 0) >= 0 ? "text-red-500" : "text-emerald-500"}`}
                  >
                    {fund.performance.oneYear !== null
                      ? `${fund.performance.oneYear > 0 ? "+" : ""}${fund.performance.oneYear}%`
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
                  <span className="text-2xl font-bold">{fund.scale}</span>
                  <span className="text-xs text-muted-foreground">管理规模</span>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card>
                <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
                  <span className="text-xs text-muted-foreground">管理费率</span>
                  <span className="text-2xl font-bold">{fund.fee}</span>
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
              {fund.navTrend.length > 0 ? (
                <NavTrendSection data={fund.navTrend} />
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
                <PerformanceCard label="近1月" value={fund.performance.oneMonth} />
                <PerformanceCard label="近3月" value={fund.performance.threeMonth} />
                <PerformanceCard label="近6月" value={fund.performance.sixMonth} />
                <PerformanceCard label="近1年" value={fund.performance.oneYear} />
              </div>
            </CardContent>
          </Card>

          {/* ====== 重仓股行情 ====== */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Users className="size-4 text-purple-500" />
                重仓股行情
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fund.topHoldings.length > 0 ? (
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
                                    : "text-muted-foreground"
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
              ) : (
                <p className="text-center text-sm text-muted-foreground">暂无重仓股数据</p>
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
              {fund.navHistory.length > 0 ? (
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
                                  growth > 0
                                    ? "text-red-500"
                                    : growth < 0
                                      ? "text-emerald-500"
                                      : "text-muted-foreground"
                                }
                              >
                                {isNaN(growth)
                                  ? "—"
                                  : `${growth > 0 ? "+" : ""}${row.dailyGrowth}%`}
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
                <InfoRow label="基金代码" value={fund.code} />
                <InfoRow label="基金名称" value={fund.name} />
                <InfoRow label="最新净值" value={`${fund.price}`} />
                <InfoRow
                  label="昨日涨跌"
                  value={`${fund.changePercent > 0 ? "+" : ""}${fund.changePercent}%`}
                />
                <InfoRow label="基金规模" value={fund.scale} />
                <InfoRow label="管理费率" value={fund.fee} />
              </div>
            </CardContent>
          </Card>

          {/* 免责声明 */}
          <p className="text-center text-xs text-muted-foreground">
            数据仅供参考，不构成投资建议。
          </p>
        </div>
        {/* 详情区域结束 */}
      </main>
    </div>
  );
}

/** 业绩走势区域（含时间范围选择器） */
type TimeRange = "1m" | "3m" | "6m" | "1y" | "3y" | "all";

const TIME_RANGES: Array<{ key: TimeRange; label: string; days: number }> = [
  { key: "1m", label: "近1月", days: 30 },
  { key: "3m", label: "近3月", days: 90 },
  { key: "6m", label: "近6月", days: 180 },
  { key: "1y", label: "近1年", days: 365 },
  { key: "3y", label: "近3年", days: 1095 },
  { key: "all", label: "成立来", days: Infinity },
];

function NavTrendSection({ data }: { data: Array<{ date: string; nav: number }> }) {
  const [range, setRange] = useState<TimeRange>("1y");

  const filtered = useMemo(() => {
    if (range === "all") return data;
    const config = TIME_RANGES.find((r) => r.key === range);
    if (!config) return data;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.filter((d) => d.date >= cutoffStr);
  }, [data, range]);

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
      <NavTrendChart data={filtered} />
    </div>
  );
}

/** 净值走势迷你图（纯SVG，支持鼠标/触摸交互，可选中数据点） */
function NavTrendChart({ data }: { data: Array<{ date: string; nav: number }> }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (data.length < 2) return <p className="text-sm text-muted-foreground">数据不足</p>;

  // 数据点过多时采样（保留约200个点）
  const recent =
    data.length > 200
      ? data.filter((_, i) => i % Math.ceil(data.length / 200) === 0 || i === data.length - 1)
      : data;

  const navs = recent.map((d) => d.nav);
  const minNav = Math.min(...navs);
  const maxNav = Math.max(...navs);
  const range = maxNav - minNav || 1;

  const width = 700;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 计算每个数据点的坐标
  const coords = recent.map((d, i) => {
    const x = padding.left + (i / (recent.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.nav - minNav) / range) * chartH;
    return { x, y, ...d };
  });

  // 生成路径字符串
  const points = coords.map((c) => `${c.x},${c.y}`);
  const areaPath = `M${points[0]} L${points.slice(1).join(" L")} L${padding.left + chartW},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;
  const linePath = `M${points[0]} L${points.slice(1).join(" L")}`;

  const isUp = navs[navs.length - 1] >= navs[0];
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = isUp ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";

  // Y轴刻度（3个，移动端更简洁）
  const yTicks = Array.from({ length: 3 }, (_, i) => {
    const val = minNav + (range * i) / 2;
    const y = padding.top + chartH - ((val - minNav) / range) * chartH;
    return { val: val.toFixed(2), y };
  });

  // X轴标签（跨年时显示年份）
  const firstYear = recent[0].date.slice(0, 4);
  const lastYear = recent[recent.length - 1].date.slice(0, 4);
  const crossYear = firstYear !== lastYear;
  const fmtDate = (d: string) => (crossYear ? d.slice(2) : d.slice(5));
  const xLabels = [
    { text: fmtDate(recent[0].date), x: padding.left },
    { text: fmtDate(recent[Math.floor(recent.length / 2)].date), x: padding.left + chartW / 2 },
    { text: fmtDate(recent[recent.length - 1].date), x: padding.left + chartW },
  ];

  // 当前展示的数据点（悬浮优先，其次选中，最后最新）
  const activeIdx = hoverIdx ?? selectedIdx;
  const active = activeIdx !== null ? coords[activeIdx] : null;

  // 区间涨跌幅
  const firstNav = navs[0];
  const activeChange = active
    ? firstNav > 0
      ? ((active.nav - firstNav) / firstNav) * 100
      : 0
    : null;

  // 根据鼠标/触摸位置计算最近的数据点索引
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

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    setHoverIdx(findClosest(e.clientX, e.currentTarget));
  };

  const handlePointerLeave = () => setHoverIdx(null);

  // 点击选中/取消选中
  const handleClick = (e: React.PointerEvent<SVGSVGElement>) => {
    const idx = findClosest(e.clientX, e.currentTarget);
    setSelectedIdx((prev) => (prev === idx ? null : idx));
  };

  // 渲染 tooltip 卡片
  const renderTooltip = (
    point: { x: number; y: number; date: string; nav: number },
    pinned: boolean,
  ) => {
    const tooltipW = 150;
    const tooltipH = 60;
    // tooltip 位置：默认右侧，超出则左侧
    const tipX = point.x + 12 + tooltipW > width ? point.x - tooltipW - 12 : point.x + 12;
    const tipY = Math.max(
      padding.top,
      Math.min(point.y - tooltipH / 2, padding.top + chartH - tooltipH),
    );
    const change = firstNav > 0 ? ((point.nav - firstNav) / firstNav) * 100 : 0;
    const changeColor = change >= 0 ? "#10b981" : "#ef4444";

    return (
      <g>
        <rect
          x={tipX}
          y={tipY}
          width={tooltipW}
          height={tooltipH}
          rx={8}
          fill="hsl(var(--popover))"
          stroke={pinned ? lineColor : "hsl(var(--border))"}
          strokeWidth={pinned ? 2 : 1}
        />
        {/* 选中指示器 */}
        {pinned && <circle cx={tipX + 12} cy={tipY + 15} r={3.5} fill={lineColor} />}
        <text
          x={tipX + (pinned ? 22 : 10)}
          y={tipY + 19}
          fontSize={11}
          className="fill-muted-foreground"
        >
          {point.date}
        </text>
        <text x={tipX + 10} y={tipY + 44} fontSize={15} fontWeight="bold" fill={lineColor}>
          {point.nav.toFixed(4)}
        </text>
        <text
          x={tipX + tooltipW - 10}
          y={tipY + 44}
          fontSize={12}
          textAnchor="end"
          fill={changeColor}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </text>
      </g>
    );
  };

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handleClick}
      >
        {/* 网格线 */}
        {yTicks.map((tick) => (
          <line
            key={tick.val}
            x1={padding.left}
            y1={tick.y}
            x2={padding.left + chartW}
            y2={tick.y}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}

        {/* 面积填充 */}
        <path d={areaPath} fill={fillColor} />

        {/* 线条 */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* 选中的数据点（持久显示） */}
        {selectedIdx !== null &&
          hoverIdx === null &&
          (() => {
            const sel = coords[selectedIdx];
            return (
              <>
                <line
                  x1={sel.x}
                  y1={padding.top}
                  x2={sel.x}
                  y2={padding.top + chartH}
                  stroke={lineColor}
                  strokeOpacity={0.4}
                  strokeDasharray="4 2"
                />
                <circle
                  cx={sel.x}
                  cy={sel.y}
                  r={5}
                  fill={lineColor}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {renderTooltip(sel, true)}
              </>
            );
          })()}

        {/* 悬浮的数据点（临时显示） */}
        {hoverIdx !== null &&
          (() => {
            const hov = coords[hoverIdx];
            const isSelected = hoverIdx === selectedIdx;
            return (
              <>
                <line
                  x1={hov.x}
                  y1={padding.top}
                  x2={hov.x}
                  y2={padding.top + chartH}
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  strokeDasharray="4 2"
                />
                <circle
                  cx={hov.x}
                  cy={hov.y}
                  r={5}
                  fill={lineColor}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {renderTooltip(hov, isSelected)}
              </>
            );
          })()}

        {/* Y轴刻度 */}
        {yTicks.map((tick) => (
          <text
            key={tick.val}
            x={padding.left - 5}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {tick.val}
          </text>
        ))}

        {/* X轴标签 */}
        {xLabels.map((label) => (
          <text
            key={label.text + label.x}
            x={label.x}
            y={height - 5}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {label.text}
          </text>
        ))}

        {/* 透明命中区域 */}
        <rect
          x={padding.left}
          y={padding.top}
          width={chartW}
          height={chartH}
          fill="transparent"
          cursor="crosshair"
        />
      </svg>

      {/* 底部提示 */}
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        {selectedIdx !== null ? "点击空白处或再次点击取消选中" : "点击数据点可选中查看详情"}
      </p>
    </div>
  );
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
