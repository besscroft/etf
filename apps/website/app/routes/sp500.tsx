import { useLoaderData } from "react-router";
import { AppLink as Link } from "~/components/ui/link";
import { useState, useMemo } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FadeIn, MotionCard } from "~/components/motion";
import { motion, AnimatePresence } from "motion/react";
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
import { DURATION, EASING } from "~/lib/motion";
import { ShareExport } from "~/components/share-export";
import { AppHeader } from "~/components/app-header";

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
      <AppHeader currentLabel="标普500" />
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {/* 标题区 */}
        <FadeIn className="mb-6 flex items-end justify-between" delay={0.1}>
          <div>
            <h1 className="mb-2 text-xl font-bold tracking-tight md:text-2xl">
              场外标普500基金对比
            </h1>
            <p className="text-sm text-muted-foreground">
              {funds.length}只 · 行情更新：{fetchedAt.slice(11, 16)}
            </p>
            <p className="text-xs text-muted-foreground">数据来源：天天基金网 / 东方财富</p>
          </div>
          <ShareExport
            module="sp500"
            data={{
              moduleTitle: "场外标普500（被动型）",
              fetchedAt,
              funds,
              filterLabel:
                filterStatus === "open"
                  ? "仅开放申购"
                  : filterStatus === "suspended"
                    ? "暂停申购"
                    : undefined,
            }}
            fileName="sp500-funds"
          />
        </FadeIn>

        {/* 列表区域 */}
        <div className="bg-background p-2">
          {/* 筛选器：移动端横向滑动，桌面端 flex-wrap */}
          <FadeIn className="mb-4 flex items-center gap-2" delay={0.15}>
            <Filter className="hidden size-4 shrink-0 text-muted-foreground md:block" />
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { key: "all" as const, label: "全部" },
                { key: "open" as const, label: `仅开放申购 (${openCount})` },
                { key: "suspended" as const, label: `暂停申购 (${suspendedCount})` },
              ].map((opt) => (
                <motion.button
                  key={opt.key}
                  onClick={() => setFilterStatus(opt.key)}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterStatus === opt.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </FadeIn>

          {/* 基金列表：移动端卡片视图（md 以下） */}
          <FadeIn className="md:hidden" delay={0.15}>
            <div className="flex flex-col gap-2 pb-4">
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">无匹配基金</div>
              )}
              {filtered.map((fund) => (
                <FundMobileCard key={`mobile-${fund.code}`} fund={fund} />
              ))}
            </div>
          </FadeIn>

          {/* 基金表格：桌面端表格视图（md 及以上） */}
          <FadeIn className="hidden md:block" delay={0.2}>
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
          </FadeIn>

          <AnimatePresence>
            {filtered.length === 0 && (
              <motion.div
                key="empty"
                className="hidden md:block"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
              >
                <Card className="mt-4 py-12">
                  <CardContent className="flex flex-col items-center gap-3 text-center">
                    <Filter className="size-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">没有符合条件的基金</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            数据仅供参考，不构成投资建议。申购状态实时变化，请以基金公司公告为准。
          </p>
        </div>
        {/* 列表区域结束 */}
      </main>
    </div>
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

/**
 * 移动端基金卡片：信息分层展示，触摸区域充足
 * 参照首页 QDII 列表卡片视图，保证移动端体验一致
 */
function FundMobileCard({ fund }: { fund: OTCFundData }) {
  const isSuspended = fund.purchaseStatus === "暂停";

  return (
    <MotionCard hover className={`relative transition-colors ${isSuspended ? "opacity-60" : ""}`}>
      <CardContent className="p-3">
        {/* 头部：代码/名称 + 申购状态 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs text-muted-foreground">{fund.code}</span>
            <Link
              to={`/fund/${fund.code}`}
              className="mt-0.5 block truncate text-sm font-medium hover:text-primary"
            >
              {fund.name}
            </Link>
          </div>
          <Badge
            variant={isSuspended ? "destructive" : "secondary"}
            className="shrink-0 text-[10px]"
          >
            {fund.purchaseStatus}
          </Badge>
        </div>

        {/* 收益指标：近1年滚动 + 昨日涨跌 */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-muted-foreground">近1年滚动</div>
            {fund.returnOneYear !== null ? (
              <span
                className={`text-base font-bold ${fund.returnOneYear > 0 ? "text-red-500" : fund.returnOneYear < 0 ? "text-emerald-500" : ""}`}
              >
                {fund.returnOneYear > 0 ? "+" : ""}
                {fund.returnOneYear.toFixed(2)}%
              </span>
            ) : (
              <span className="text-base font-bold text-muted-foreground">—</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">昨日涨跌</div>
            {fund.changeDaily !== null ? (
              <span
                className={`flex items-center justify-end gap-0.5 text-sm font-medium ${fund.changeDaily > 0 ? "text-red-500" : fund.changeDaily < 0 ? "text-emerald-500" : ""}`}
              >
                {fund.changeDaily > 0 ? (
                  <TrendingUp className="size-3" />
                ) : fund.changeDaily < 0 ? (
                  <TrendingDown className="size-3" />
                ) : null}
                {fund.changeDaily > 0 ? "+" : ""}
                {fund.changeDaily.toFixed(2)}%
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {/* 底部：规模/限额 + 查看详情 */}
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <div className="flex min-w-0 flex-1 flex-col text-xs text-muted-foreground">
            <span>规模 {fund.scale > 0 ? `${fund.scale.toFixed(1)}亿` : "—"}</span>
            <span className="truncate">限额 {fund.purchaseLimit}</span>
          </div>
          <Link
            to={`/fund/${fund.code}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <TrendingUp className="size-3" />
            详情
          </Link>
        </div>
      </CardContent>
    </MotionCard>
  );
}

function ReturnBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const color = value > 0 ? "text-red-500" : value < 0 ? "text-emerald-500" : "";
  return (
    <span className={`font-medium ${color}`}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function ChangeValue({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const color = value > 0 ? "text-red-500" : value < 0 ? "text-emerald-500" : "";
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
