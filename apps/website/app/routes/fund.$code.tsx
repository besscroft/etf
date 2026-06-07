import type { Route } from "./+types/fund.$code";
import { useLoaderData, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Trophy,
  LineChart,
  History,
  Users,
} from "lucide-react";
import { getFundDetailData } from "~/lib/market-data";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `ETFVoid - 基金 ${params.code}` },
    { name: "description", content: `ETF基金 ${params.code} 详情` },
  ];
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

  // 溢价等级判定
  const premiumLevel =
    fund.premium >= 3
      ? { label: "极高", color: "text-red-500", bg: "bg-red-500/10" }
      : fund.premium >= 2
        ? { label: "偏高", color: "text-amber-500", bg: "bg-amber-500/10" }
        : fund.premium >= 1
          ? { label: "注意", color: "text-amber-400", bg: "bg-amber-400/10" }
          : { label: "正常", color: "text-emerald-500", bg: "bg-emerald-500/10" };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
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
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-3 py-6 sm:px-4">
        {/* 基金标题 */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold md:text-3xl">{fund.name}</h1>
            <Badge variant="secondary" className="font-mono">
              {fund.code}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">跟踪指数：{fund.index}</p>
        </div>

        {/* 核心指标卡片 */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
              <span className="text-xs text-muted-foreground">当前价格</span>
              <span className="text-2xl font-bold">{fund.price || "—"}</span>
              <span className="flex items-center gap-1 text-xs">
                {fund.changePercent > 0 ? (
                  <TrendingUp className="size-3 text-emerald-500" />
                ) : fund.changePercent < 0 ? (
                  <TrendingDown className="size-3 text-red-500" />
                ) : (
                  <Activity className="size-3 text-muted-foreground" />
                )}
                <span
                  className={
                    fund.changePercent > 0
                      ? "text-emerald-500"
                      : fund.changePercent < 0
                        ? "text-red-500"
                        : "text-muted-foreground"
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
              <span className="text-xs text-muted-foreground">溢价率</span>
              <span className={`text-2xl font-bold ${premiumLevel.color}`}>+{fund.premium}%</span>
              <span className={`text-xs ${premiumLevel.color}`}>{premiumLevel.label}</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
              <span className="text-xs text-muted-foreground">基金规模</span>
              <span className="text-2xl font-bold">{fund.scale}</span>
              <span className="text-xs text-muted-foreground">管理规模</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-0.5 py-4 text-center">
              <span className="text-xs text-muted-foreground">管理费率</span>
              <span className="text-2xl font-bold">{fund.fee}</span>
              <span className="text-xs text-muted-foreground">年费率</span>
            </CardContent>
          </Card>
        </div>

        {/* 溢价分析 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <AlertTriangle className="size-4 text-amber-500" />
              溢价分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 溢价进度条 */}
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>折价</span>
                <span>0%</span>
                <span>溢价</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`absolute left-1/2 top-0 h-full rounded-full transition-all ${
                    fund.premium >= 3
                      ? "bg-red-500"
                      : fund.premium >= 2
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(50, (fund.premium / 10) * 50)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>-5%</span>
                <span>+5%</span>
                <span>+10%+</span>
              </div>
            </div>

            {/* 溢价提示 */}
            <div className={`rounded-md p-3 ${premiumLevel.bg}`}>
              <p className={`text-sm ${premiumLevel.color}`}>
                {fund.premium >= 3
                  ? "溢价极高！建议等待溢价收窄后再买入，避免高位接盘。场内买入价格远高于基金净值，存在较大回落风险。"
                  : fund.premium >= 2
                    ? "溢价偏高，买入需谨慎。场内价格高于基金净值，若溢价收窄可能产生额外亏损。"
                    : fund.premium >= 1
                      ? "溢价适中，可关注。场内价格略高于基金净值，属于正常波动范围。"
                      : "溢价较低，相对安全。场内价格接近基金净值。"}
              </p>
            </div>
          </CardContent>
        </Card>

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
              <NavTrendChart data={fund.navTrend} />
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
                          {stock.price > 0 ? `$${stock.price.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={
                              stock.changePercent > 0
                                ? "text-emerald-500"
                                : stock.changePercent < 0
                                  ? "text-red-500"
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
                                  ? "text-emerald-500"
                                  : growth < 0
                                    ? "text-red-500"
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
              <InfoRow label="基金代码" value={fund.code} />
              <InfoRow label="基金名称" value={fund.name} />
              <InfoRow label="跟踪指数" value={fund.index} />
              <InfoRow label="当前价格" value={`${fund.price} 元`} />
              <InfoRow
                label="今日涨跌"
                value={`${fund.changePercent > 0 ? "+" : ""}${fund.changePercent}%`}
              />
              <InfoRow label="溢价率" value={`+${fund.premium}%`} />
              <InfoRow label="基金规模" value={fund.scale} />
              <InfoRow label="管理费率" value={fund.fee} />
            </div>
          </CardContent>
        </Card>

        {/* 免责声明 */}
        <p className="text-center text-xs text-muted-foreground">
          数据仅供参考，不构成投资建议。溢价率实时变化，请以实际交易数据为准。
        </p>
      </main>
    </div>
  );
}

/** 净值走势迷你图（纯SVG，无第三方依赖） */
function NavTrendChart({ data }: { data: Array<{ date: string; nav: number }> }) {
  // 取最近90个点用于展示
  const recent = data.slice(-90);
  if (recent.length < 2) return <p className="text-sm text-muted-foreground">数据不足</p>;

  const navs = recent.map((d) => d.nav);
  const minNav = Math.min(...navs);
  const maxNav = Math.max(...navs);
  const range = maxNav - minNav || 1;

  const width = 700;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 生成路径点
  const points = recent.map((d, i) => {
    const x = padding.left + (i / (recent.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.nav - minNav) / range) * chartH;
    return `${x},${y}`;
  });

  // 面积填充路径
  const areaPath = `M${points[0]} L${points.slice(1).join(" L")} L${padding.left + chartW},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  // 线条路径
  const linePath = `M${points[0]} L${points.slice(1).join(" L")}`;

  // 判断整体涨跌
  const isUp = navs[navs.length - 1] >= navs[0];
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = isUp ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";

  // Y轴刻度（5个）
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minNav + (range * i) / 4;
    const y = padding.top + chartH - ((val - minNav) / range) * chartH;
    return { val: val.toFixed(3), y };
  });

  // X轴标签（首、中、末）
  const xLabels = [
    { text: recent[0].date.slice(5), x: padding.left },
    {
      text: recent[Math.floor(recent.length / 2)].date.slice(5),
      x: padding.left + chartW / 2,
    },
    { text: recent[recent.length - 1].date.slice(5), x: padding.left + chartW },
  ];

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
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
      </svg>
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
        ? "text-emerald-500"
        : value < 0
          ? "text-red-500"
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
