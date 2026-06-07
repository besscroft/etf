import { useLoaderData, Link } from "react-router";
import { useState, useMemo } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  ArrowLeft,
  BarChart3,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getETFPremiumData } from "~/lib/market-data";

export function meta() {
  return [
    { title: "ETFVoid - 场内ETF（纳指/标普）" },
    {
      name: "description",
      content: "场内纳指100/标普500 ETF对比：溢价率、规模、成交额一览",
    },
  ];
}

export async function loader() {
  const etfList = await getETFPremiumData();
  return { etfList, fetchedAt: new Date().toISOString() };
}

type SortField = "code" | "name" | "index" | "scale" | "premium" | "changePercent";
type SortDir = "asc" | "desc";

export default function ETF() {
  const { etfList, fetchedAt } = useLoaderData<typeof loader>();
  const [sortField, setSortField] = useState<SortField>("premium");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "premium" || field === "scale" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    const list = [...etfList];
    list.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortField) {
        case "code":
          va = a.code;
          vb = b.code;
          break;
        case "name":
          va = a.name;
          vb = b.name;
          break;
        case "index":
          va = a.index;
          vb = b.index;
          break;
        case "scale":
          va = parseFloat(a.scale) || 0;
          vb = parseFloat(b.scale) || 0;
          break;
        case "premium":
          va = a.premium;
          vb = b.premium;
          break;
        case "changePercent":
          va = a.changePercent;
          vb = b.changePercent;
          break;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [etfList, sortField, sortDir]);

  // 统计高溢价ETF数量
  const highPremiumCount = etfList.filter((e) => e.premium >= 3).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {/* 标题区 */}
        <section className="mb-6">
          <h1 className="mb-2 text-xl font-bold tracking-tight md:text-2xl">
            场内ETF（纳指 / 标普）
          </h1>
          <p className="text-sm text-muted-foreground">
            {etfList.length}只 · 行情更新：{fetchedAt.slice(11, 16)}
          </p>
          <p className="text-xs text-muted-foreground">数据来源：东方财富 / 新浪财经</p>
        </section>

        {/* 溢价预警 */}
        {highPremiumCount > 0 && (
          <Card className="mb-6 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex gap-3 py-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div>
                <p className="mb-1 text-sm font-medium">溢价预警</p>
                <p className="text-xs text-muted-foreground md:text-sm">
                  当前有 {highPremiumCount}{" "}
                  只ETF溢价率超过3%，买入需谨慎。高溢价意味着场内价格远高于净值，溢价收窄时可能面临较大亏损。
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ETF表格 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <ThSortableCell
                      label="代码"
                      field="code"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <ThSortableCell
                      label="ETF名称"
                      field="name"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <ThSortableCell
                      label="跟踪指数"
                      field="index"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <ThSortableCell
                      label="规模(亿)"
                      field="scale"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <ThSortableCell
                      label="昨日涨跌"
                      field="changePercent"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <ThSortableCell
                      label="溢价率"
                      field="premium"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((etf) => (
                    <ETFRow key={etf.code} etf={etf} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {sorted.length === 0 && (
          <Card className="mt-4 py-12">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <BarChart3 className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">暂无场内ETF数据</p>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          溢价率 = (市价 - 净值) / 净值 × 100%。数据仅供参考，不构成投资建议。
        </p>
      </main>
    </div>
  );
}

function Header() {
  return (
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
        <span className="font-medium">场内ETF</span>
      </div>
    </header>
  );
}

function ThSortableCell({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

function ETFRow({
  etf,
}: {
  etf: {
    code: string;
    name: string;
    index: string;
    premium: number;
    price: number;
    changePercent: number;
    scale: string;
    fee: string;
  };
}) {
  // 溢价等级
  const premiumLevel =
    etf.premium >= 5
      ? { label: "极高", color: "text-red-600", bg: "bg-red-500/10" }
      : etf.premium >= 3
        ? { label: "极高", color: "text-red-500", bg: "bg-red-500/10" }
        : etf.premium >= 2
          ? { label: "偏高", color: "text-amber-500", bg: "bg-amber-500/10" }
          : etf.premium >= 1
            ? { label: "注意", color: "text-amber-400", bg: "bg-amber-400/10" }
            : { label: "正常", color: "text-emerald-500", bg: "bg-emerald-500/10" };

  return (
    <tr className="border-b last:border-0 transition-colors hover:bg-muted/30">
      <td className="py-2.5 px-3 font-mono text-xs">{etf.code}</td>
      <td className="py-2.5 px-3">
        <Link to={`/fund/${etf.code}`} className="hover:text-primary hover:underline text-sm">
          {etf.name}
        </Link>
      </td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{etf.index}</td>
      <td className="py-2.5 px-3 text-right">{etf.scale}</td>
      <td className="py-2.5 px-3 text-right">
        <span
          className={`flex items-center justify-end gap-0.5 ${etf.changePercent > 0 ? "text-emerald-500" : etf.changePercent < 0 ? "text-red-500" : ""}`}
        >
          {etf.changePercent > 0 ? (
            <TrendingUp className="size-3" />
          ) : etf.changePercent < 0 ? (
            <TrendingDown className="size-3" />
          ) : null}
          {etf.changePercent > 0 ? "+" : ""}
          {etf.changePercent.toFixed(2)}%
        </span>
      </td>
      <td className="py-2.5 px-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <span className={`font-medium ${premiumLevel.color}`}>+{etf.premium.toFixed(2)}%</span>
          <Badge
            variant="secondary"
            className={`text-xs ${premiumLevel.bg} ${premiumLevel.color} border-0`}
          >
            {premiumLevel.label}
          </Badge>
        </div>
      </td>
    </tr>
  );
}
