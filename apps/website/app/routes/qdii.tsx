import { Await, useLoaderData } from "react-router";
import { AppLink as Link } from "~/components/ui/link";
import { Suspense, useState, useMemo } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/motion";
import { motion, AnimatePresence } from "motion/react";
import { buildMeta } from "~/lib/seo";
import {
  ArrowLeft,
  BarChart3,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Filter,
  TrendingUp,
  TrendingDown,
  GitCompare,
  Search,
} from "lucide-react";
import { getAllQDIIFundData, type QDIIFundData, type QDIICategory } from "~/lib/market-data";
import { DURATION, EASING } from "~/lib/motion";
import { ShareExport } from "~/components/share-export";
import { AppHeader } from "~/components/app-header";
import { FundListTableSkeleton } from "~/components/ui/skeletons";

export function meta() {
  return buildMeta({
    title: "QDII 基金大全",
    description:
      "全部QDII基金一览：纳斯达克100、标普500、主动型美股，支持多基金对比与单基金深度分析",
    path: "/qdii",
  });
}

export async function loader() {
  // 返回未 await 的 Promise：标题计数/分类按钮/表格各自流式进入。
  return {
    funds: getAllQDIIFundData(),
    fetchedAt: Promise.resolve(new Date().toISOString()),
  };
}

type SortField =
  | "code"
  | "name"
  | "categoryLabel"
  | "scale"
  | "returnOneYear"
  | "changeDaily"
  | "purchaseStatus";
type SortDir = "asc" | "desc";
type FilterCategory = "all" | QDIICategory;
type FilterStatus = "all" | "open" | "suspended";

export default function QDII() {
  const data = useLoaderData<typeof loader>();
  const [sortField, setSortField] = useState<SortField>("returnOneYear");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [compareList, setCompareList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "returnOneYear" || field === "scale" ? "desc" : "asc");
    }
  };

  const toggleCompare = (code: string) => {
    setCompareList((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="QDII 基金" />
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {/* 标题区：等待 funds + fetchedAt，加载时显示"加载中…" */}
        <Suspense
          fallback={
            <div className="mb-6">
              <div className="h-7 w-32 bg-muted animate-pulse rounded" />
              <div className="mt-2 h-4 w-48 bg-muted animate-pulse rounded" />
            </div>
          }
        >
          <Await resolve={data.funds}>
            {(funds) => (
              <Await resolve={data.fetchedAt}>
                {(fetchedAt) => (
                  <FadeIn className="mb-6 flex items-end justify-between" delay={0.1}>
                    <div>
                      <h1 className="mb-2 text-xl font-bold tracking-tight md:text-2xl">
                        QDII 基金一览
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        {funds.length}只 · 行情更新：{fetchedAt.slice(11, 16)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        数据来源：天天基金网 / 东方财富
                      </p>
                    </div>
                    <ShareExport
                      module="qdii"
                      data={{
                        moduleTitle: "QDII 基金一览",
                        fetchedAt,
                        funds,
                        filterLabel: [
                          filterCategory === "nasdaq100"
                            ? "纳指100"
                            : filterCategory === "sp500"
                              ? "标普500"
                              : filterCategory === "active"
                                ? "主动型"
                                : undefined,
                          filterStatus === "open"
                            ? "仅开放申购"
                            : filterStatus === "suspended"
                              ? "暂停申购"
                              : undefined,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      }}
                      fileName="qdii-funds"
                    />
                  </FadeIn>
                )}
              </Await>
            )}
          </Await>
        </Suspense>

        {/* 列表区域 */}
        <div className="bg-background p-2">
          {/* 搜索栏（不依赖数据，立即渲染） */}
          <FadeIn className="mb-4" delay={0.12}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索基金代码或名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </FadeIn>

          {/* 分类筛选（依赖 funds 取数量） */}
          <Suspense
            fallback={
              <FadeIn className="mb-3 flex items-center gap-2" delay={0.15}>
                <Filter className="size-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              </FadeIn>
            }
          >
            <Await resolve={data.funds}>
              {(funds) => {
                const nasdaqCount = funds.filter((f) => f.category === "nasdaq100").length;
                const sp500Count = funds.filter((f) => f.category === "sp500").length;
                const activeCount = funds.filter((f) => f.category === "active").length;
                const openCount = funds.filter((f) => f.purchaseStatus !== "暂停").length;
                const suspendedCount = funds.filter((f) => f.purchaseStatus === "暂停").length;
                return (
                  <>
                    <FadeIn className="mb-3 flex items-center gap-2" delay={0.15}>
                      <Filter className="size-4 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: "all" as const, label: `全部 (${funds.length})` },
                          { key: "nasdaq100" as const, label: `纳指100 (${nasdaqCount})` },
                          { key: "sp500" as const, label: `标普500 (${sp500Count})` },
                          { key: "active" as const, label: `主动型 (${activeCount})` },
                        ].map((opt) => (
                          <motion.button
                            key={opt.key}
                            onClick={() => setFilterCategory(opt.key)}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                              filterCategory === opt.key
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {opt.label}
                          </motion.button>
                        ))}
                      </div>
                    </FadeIn>

                    {/* 申购状态筛选 */}
                    <FadeIn className="mb-4 flex items-center gap-2" delay={0.17}>
                      <div className="flex gap-1.5">
                        {[
                          { key: "all" as const, label: "全部状态" },
                          { key: "open" as const, label: `开放申购 (${openCount})` },
                          { key: "suspended" as const, label: `暂停申购 (${suspendedCount})` },
                        ].map((opt) => (
                          <motion.button
                            key={opt.key}
                            onClick={() => setFilterStatus(opt.key)}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
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
                  </>
                );
              }}
            </Await>
          </Suspense>

          {/* 对比浮动栏 + 表格 + 空状态（依赖 funds） */}
          <Suspense fallback={<FundListTableSkeleton />}>
            <Await resolve={data.funds}>
              {(funds) => {
                // 不在此处用 useMemo（hooks 规则 + 列表不算重），直接内联计算
                let filtered = [...funds];
                if (searchQuery.trim()) {
                  const q = searchQuery.trim().toLowerCase();
                  filtered = filtered.filter(
                    (f) =>
                      f.code.includes(q) ||
                      f.name.toLowerCase().includes(q) ||
                      f.categoryLabel.includes(q),
                  );
                }
                if (filterCategory !== "all") {
                  filtered = filtered.filter((f) => f.category === filterCategory);
                }
                if (filterStatus === "open") {
                  filtered = filtered.filter((f) => f.purchaseStatus !== "暂停");
                } else if (filterStatus === "suspended") {
                  filtered = filtered.filter((f) => f.purchaseStatus === "暂停");
                }
                filtered.sort((a, b) => {
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
                    case "categoryLabel":
                      va = a.categoryLabel;
                      vb = b.categoryLabel;
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
                  return sortDir === "asc"
                    ? (va as number) - (vb as number)
                    : (vb as number) - (va as number);
                });

                return (
                  <>
                    {/* 对比浮动栏 */}
                    <AnimatePresence>
                      {compareList.length > 0 && (
                        <motion.div
                          key="compare-bar"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
                          className="mb-4"
                        >
                          <Card className="border-primary/30 bg-primary/5">
                            <CardContent className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-2">
                                <GitCompare className="size-4 text-primary" />
                                <span className="text-sm font-medium">
                                  已选 {compareList.length} 只基金
                                </span>
                                <div className="flex gap-1">
                                  {compareList.map((code) => {
                                    const fund = funds.find((f) => f.code === code);
                                    return (
                                      <Badge key={code} variant="secondary" className="text-xs">
                                        {fund?.name?.slice(0, 6) ?? code}
                                        <button
                                          onClick={() => toggleCompare(code)}
                                          className="ml-1 hover:text-destructive"
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCompareList([])}
                                >
                                  清空
                                </Button>
                                {compareList.length >= 2 && (
                                  <Button size="sm" asChild>
                                    <Link to={`/cn/funds?funds=${compareList.join(",")}`}>
                                      <GitCompare className="mr-1 size-3" />
                                      对比
                                    </Link>
                                  </Button>
                                )}
                                {compareList.length === 1 && (
                                  <Button size="sm" asChild>
                                    <Link to={`/cn/fund?code=${compareList[0]}`}>
                                      <BarChart3 className="mr-1 size-3" />
                                      分析
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 基金表格 */}
                    <FadeIn delay={0.2}>
                      <Card>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  <ThCell>对比</ThCell>
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
                                    label="类型"
                                    field="categoryLabel"
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
                                  <FundRow
                                    key={`${fund.category}-${fund.code}`}
                                    fund={fund}
                                    isSelected={compareList.includes(fund.code)}
                                    onToggleCompare={() => toggleCompare(fund.code)}
                                  />
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
                  </>
                );
              }}
            </Await>
          </Suspense>

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

/** 分类标签颜色映射 */
const CATEGORY_COLORS: Record<QDIICategory, string> = {
  nasdaq100: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  sp500: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  active: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function FundRow({
  fund,
  isSelected,
  onToggleCompare,
}: {
  fund: QDIIFundData;
  isSelected: boolean;
  onToggleCompare: () => void;
}) {
  const isSuspended = fund.purchaseStatus === "暂停";

  return (
    <tr
      className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${isSuspended ? "opacity-60" : ""}`}
    >
      <td className="py-2.5 px-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleCompare}
          className="size-3.5 rounded border-muted-foreground/30 accent-primary"
          aria-label={`选择 ${fund.name} 进行对比`}
        />
      </td>
      <td className="py-2.5 px-3 font-mono text-xs">{fund.code}</td>
      <td className="py-2.5 px-3">
        <Link to={`/fund/${fund.code}`} className="hover:text-primary hover:underline text-sm">
          {fund.name}
        </Link>
      </td>
      <td className="py-2.5 px-3">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[fund.category]}`}
        >
          {fund.categoryLabel}
        </span>
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
