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
} from "lucide-react";
import { getFundDetail } from "~/lib/market-data";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `ETFVoid - 基金 ${params.code}` },
    { name: "description", content: `ETF基金 ${params.code} 详情` },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const fund = await getFundDetail(params.code);
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:flex-col sm:items-start sm:gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
