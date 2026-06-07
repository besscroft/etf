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
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getSP500OTCData, type OTCFundData } from "~/lib/market-data";

export function meta() {
  return [
    { title: "ETFVoid - 场外标普500（被动型）" },
    {
      name: "description",
      content: "场外标普500指数基金对比：规模、收益率、申购状态一览",
    },
  ];
}

export async function loader() {
  const funds = await getSP500OTCData();
  return { funds, fetchedAt: new Date().toISOString() };
}

type SortField = "code" | "name" | "scale" | "returnOneYear" | "changeDaily" | "purchaseStatus";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | "open" | "suspended";

export default function SP500() {
  const { funds, fetchedAt } = useLoaderData<typeof loader>();
  const [sortField, setSortField] = useState<SortField>("returnOneYear");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "returnOneYear" || field === "scale" ? "desc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...funds];
    if (filterStatus === "open") {
      list = list.filter((f) => f.purchaseStatus !== "暂停");
    } else if (filterStatus === "suspended") {
      list = list.filter((f) => f.purchaseStatus === "暂停");
    }
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
        case "scale":
          va = a.scale;
          vb = b.scale;
          break;
        case "returnOneYear":
          va = a.returnOneYear ?? -999;
          vb = b.returnOneYear ?? -999;
          break;
        case "changeDaily":
          va = a.changeDaily ?? -999;
          vb = b.changeDaily ?? -999;
          break;
        case "purchaseStatus":
          va = a.purchaseStatus;
          vb = b.purchaseStatus;
          break;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [funds, filterStatus, sortField, sortDir]);

  const openCount = funds.filter((f) => f.purchaseStatus !== "暂停").length;
  const suspendedCount = funds.filter((f) => f.purchaseStatus === "暂停").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {/* 标题区 */}
        <section className="mb-6">
          <h1 className="mb-2 text-xl font-bold tracking-tight md:text-2xl">场外标普500基金对比</h1>
          <p className="text-sm text-muted-foreground">
            {funds.length}只 · 行情更新：{fetchedAt.slice(11, 16)}
          </p>
          <p className="text-xs text-muted-foreground">数据来源：天天基金网 / 东方财富</p>
        </section>

        {/* 筛选器 */}
        <div className="mb-4 flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <div className="flex gap-1.5">
            {[
              { key: "all" as const, label: "全部" },
              { key: "open" as const, label: `仅开放申购 (${openCount})` },
              { key: "suspended" as const, label: `暂停申购 (${suspendedCount})` },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterStatus(opt.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterStatus === opt.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 基金表格 */}
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
                      label="基金名称"
                      field="name"
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
                      label="近1年滚动"
                      field="returnOneYear"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <ThSortableCell
                      label="昨日涨跌"
                      field="changeDaily"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <ThCell>申购限额</ThCell>
                    <ThSortableCell
                      label="申购状态"
                      field="purchaseStatus"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((fund) => (
                    <FundRow key={fund.code} fund={fund} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 && (
          <Card className="mt-4 py-12">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <Filter className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">没有符合条件的基金</p>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          数据仅供参考，不构成投资建议。申购状态实时变化，请以基金公司公告为准。
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
        <span className="font-medium">标普500</span>
      </div>
    </header>
  );
}

function ThCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
      {children}
    </th>
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

function FundRow({ fund }: { fund: OTCFundData }) {
  const isSuspended = fund.purchaseStatus === "暂停";

  return (
    <tr
      className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${isSuspended ? "opacity-60" : ""}`}
    >
      <td className="py-2.5 px-3 font-mono text-xs">{fund.code}</td>
      <td className="py-2.5 px-3">
        <Link to={`/fund/${fund.code}`} className="hover:text-primary hover:underline text-sm">
          {fund.name}
        </Link>
      </td>
      <td className="py-2.5 px-3 text-right">{fund.scale > 0 ? fund.scale.toFixed(1) : "—"}</td>
      <td className="py-2.5 px-3 text-right">
        <ReturnBadge value={fund.returnOneYear} />
      </td>
      <td className="py-2.5 px-3 text-right">
        <ChangeValue value={fund.changeDaily} />
      </td>
      <td className="py-2.5 px-3 text-right text-xs">{fund.purchaseLimit}</td>
      <td className="py-2.5 px-3 text-right">
        <Badge variant={isSuspended ? "destructive" : "secondary"} className="text-xs">
          {fund.purchaseStatus}
        </Badge>
      </td>
    </tr>
  );
}

function ReturnBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const color = value > 0 ? "text-emerald-500" : value < 0 ? "text-red-500" : "";
  return (
    <span className={`font-medium ${color}`}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function ChangeValue({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const color = value > 0 ? "text-emerald-500" : value < 0 ? "text-red-500" : "";
  return (
    <span className={`flex items-center justify-end gap-0.5 ${color}`}>
      {value > 0 ? (
        <TrendingUp className="size-3" />
      ) : value < 0 ? (
        <TrendingDown className="size-3" />
      ) : null}
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
