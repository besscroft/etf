import { useLoaderData, Link } from "react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/motion";
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
  Search,
  RefreshCw,
  Bell,
  BellRing,
  AlertTriangle,
  Activity,
  Clock,
  Eye,
  X,
} from "lucide-react";
import {
  getQDIIValuationData,
  getQDIIValuationHistory,
  type QDIIValuationData,
  type QDIICategory,
  type MarketSession,
} from "~/lib/market-data";
import { DURATION, EASING } from "~/lib/motion";
import { ShareExport } from "~/components/share-export";

export function meta() {
  return [
    { title: "ETFVoid - QDII 基金估值" },
    {
      name: "description",
      content: "QDII基金实时估值追踪：盘中估值、估值偏差分析、估值走势与预警",
    },
  ];
}

export async function loader() {
  const funds = await getQDIIValuationData();
  return { funds, fetchedAt: new Date().toISOString() };
}

type SortField =
  | "code"
  | "name"
  | "categoryLabel"
  | "estimatedNav"
  | "estimatedChange"
  | "actualNav"
  | "deviation"
  | "navDate";
type SortDir = "asc" | "desc";
type FilterCategory = "all" | QDIICategory;

/** 估值预警配置（存储在 localStorage） */
interface AlertConfig {
  code: string;
  name: string;
  threshold: number; // 涨跌幅阈值(%)
  direction: "up" | "down" | "both"; // 触发方向
}

const ALERTS_STORAGE_KEY = "qdii-valuation-alerts";

function loadAlerts(): AlertConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: AlertConfig[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

/** 市场时段标签 */
function SessionBadge({ session }: { session: MarketSession }) {
  const config = {
    pre: { label: "盘前", variant: "secondary" as const, icon: Clock },
    intraday: { label: "盘中", variant: "default" as const, icon: Activity },
    after: { label: "盘后", variant: "outline" as const, icon: Clock },
  }[session];

  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      <config.icon className="size-3" />
      {config.label}
    </Badge>
  );
}

export default function QDIIValuation() {
  const { funds, fetchedAt } = useLoaderData<typeof loader>();
  const [sortField, setSortField] = useState<SortField>("estimatedChange");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [_retryCount, _setRetryCount] = useState(0);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [alertFund, setAlertFund] = useState<QDIIValuationData | null>(null);
  const [alertThreshold, setAlertThreshold] = useState(2);
  const [alertDirection, setAlertDirection] = useState<"up" | "down" | "both">("both");
  const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set());

  // 展开基金详情（估值走势图）
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<
    Array<{ date: string; estimatedNav: number; actualNav: number | null; estimatedChange: number }>
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 加载预警配置
  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  // 检查预警触发
  useEffect(() => {
    const newTriggered = new Set<string>();
    for (const alert of alerts) {
      const fund = funds.find((f) => f.code === alert.code);
      if (!fund || fund.error) continue;
      const change = fund.estimatedChange;
      if (
        (alert.direction === "up" && change >= alert.threshold) ||
        (alert.direction === "down" && change <= -alert.threshold) ||
        (alert.direction === "both" && Math.abs(change) >= alert.threshold)
      ) {
        newTriggered.add(alert.code);
      }
    }
    setTriggeredAlerts(newTriggered);
  }, [funds, alerts]);

  // 自动刷新（盘中每60秒，盘后不刷新）
  useEffect(() => {
    const session = funds[0]?.marketSession ?? "after";
    if (session !== "intraday") return;

    const interval = setInterval(() => {
      void handleRefresh();
    }, 60_000);

    return () => clearInterval(interval);
  }, [funds]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 通过 revalidation 刷新数据
      window.location.reload();
    } catch {
      // 刷新失败静默处理
    }
    setRefreshing(false);
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(
        field === "estimatedChange" || field === "estimatedNav" || field === "deviation"
          ? "desc"
          : "asc",
      );
    }
  };

  const filtered = useMemo(() => {
    let list = [...funds];

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.code.includes(q) || f.name.toLowerCase().includes(q) || f.categoryLabel.includes(q),
      );
    }

    // 分类筛选
    if (filterCategory !== "all") {
      list = list.filter((f) => f.category === filterCategory);
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
        case "categoryLabel":
          va = a.categoryLabel;
          vb = b.categoryLabel;
          break;
        case "estimatedNav":
          va = a.estimatedNav;
          vb = b.estimatedNav;
          break;
        case "estimatedChange":
          va = a.estimatedChange;
          vb = b.estimatedChange;
          break;
        case "actualNav":
          va = a.actualNav ?? -999;
          vb = b.actualNav ?? -999;
          break;
        case "deviation":
          va = a.deviation ?? -999;
          vb = b.deviation ?? -999;
          break;
        case "navDate":
          va = a.navDate;
          vb = b.navDate;
          break;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [funds, filterCategory, sortField, sortDir, searchQuery]);

  const session = funds[0]?.marketSession ?? "after";
  const nasdaqCount = funds.filter((f) => f.category === "nasdaq100").length;
  const sp500Count = funds.filter((f) => f.category === "sp500").length;
  const activeCount = funds.filter((f) => f.category === "active").length;
  const errorCount = funds.filter((f) => f.error).length;

  // 展开/收起基金详情
  const toggleExpand = async (code: string) => {
    if (expandedCode === code) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(code);
    setHistoryLoading(true);
    try {
      const data = await getQDIIValuationHistory(code, 30);
      setHistoryData(data);
    } catch {
      setHistoryData([]);
    }
    setHistoryLoading(false);
  };

  // 添加预警
  const addAlert = (fund: QDIIValuationData) => {
    const newAlert: AlertConfig = {
      code: fund.code,
      name: fund.name,
      threshold: alertThreshold,
      direction: alertDirection,
    };
    const updated = [...alerts.filter((a) => a.code !== fund.code), newAlert];
    setAlerts(updated);
    saveAlerts(updated);
    setAlertFund(null);
  };

  // 删除预警
  const removeAlert = (code: string) => {
    const updated = alerts.filter((a) => a.code !== code);
    setAlerts(updated);
    saveAlerts(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {/* 标题区 */}
        <FadeIn className="mb-6" delay={0.1}>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="mb-2 text-xl font-bold tracking-tight md:text-2xl">QDII 基金估值</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {funds.length}只 · 更新：{fetchedAt.slice(11, 16)}
                </p>
                <SessionBadge session={session} />
              </div>
              <p className="text-xs text-muted-foreground">
                数据来源：天天基金网 · 估值仅供参考，以实际净值为准
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* 预警按钮 */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAlertPanel(!showAlertPanel)}
                  className="relative"
                >
                  {triggeredAlerts.size > 0 ? (
                    <BellRing className="mr-1 size-4 text-amber-500" />
                  ) : (
                    <Bell className="mr-1 size-4" />
                  )}
                  预警
                  {alerts.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                      {alerts.length}
                    </span>
                  )}
                </Button>
              </div>
              {/* 刷新按钮 */}
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-1 size-4 ${refreshing ? "animate-spin" : ""}`} />
                刷新
              </Button>
              {/* 导出图片 */}
              <ShareExport
                module="valuation"
                data={{ funds, session, fetchedAt }}
                fileName="qdii-valuation"
              />
            </div>
          </div>
        </FadeIn>

        {/* 预警面板 */}
        <AnimatePresence>
          {showAlertPanel && (
            <motion.div
              key="alert-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
              className="mb-4 overflow-hidden"
            >
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Bell className="size-4 text-amber-500" />
                    估值预警设置
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      暂无预警，点击表格中的铃铛图标为基金添加预警
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map((alert) => {
                        const fund = funds.find((f) => f.code === alert.code);
                        const isTriggered = triggeredAlerts.has(alert.code);
                        return (
                          <div
                            key={alert.code}
                            className={`flex items-center justify-between rounded-md border p-2 ${
                              isTriggered ? "border-amber-500 bg-amber-500/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isTriggered && <AlertTriangle className="size-4 text-amber-500" />}
                              <span className="text-sm font-medium">{alert.name}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {alert.code}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {alert.direction === "up"
                                  ? "涨≥"
                                  : alert.direction === "down"
                                    ? "跌≥"
                                    : "波动≥"}
                                {alert.threshold}%
                              </Badge>
                              {isTriggered && (
                                <Badge variant="destructive" className="text-xs">
                                  已触发
                                </Badge>
                              )}
                              {fund && !fund.error && (
                                <span
                                  className={`text-xs font-medium ${
                                    fund.estimatedChange > 0
                                      ? "text-red-500"
                                      : fund.estimatedChange < 0
                                        ? "text-emerald-500"
                                        : ""
                                  }`}
                                >
                                  当前: {fund.estimatedChange > 0 ? "+" : ""}
                                  {fund.estimatedChange.toFixed(2)}%
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAlert(alert.code)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 添加预警弹窗 */}
        <AnimatePresence>
          {alertFund && (
            <motion.div
              key="alert-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setAlertFund(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                className="mx-4 w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-3 text-sm font-semibold">设置预警 - {alertFund.name}</h3>
                <div className="mb-3">
                  <label className="mb-1 block text-xs text-muted-foreground">涨跌幅阈值(%)</label>
                  <input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(parseFloat(e.target.value) || 1)}
                    min={0.1}
                    max={20}
                    step={0.1}
                    className="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-xs text-muted-foreground">触发方向</label>
                  <div className="flex gap-2">
                    {[
                      { key: "up" as const, label: "上涨时" },
                      { key: "down" as const, label: "下跌时" },
                      { key: "both" as const, label: "双向" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setAlertDirection(opt.key)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          alertDirection === opt.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAlertFund(null)}>
                    取消
                  </Button>
                  <Button size="sm" onClick={() => addAlert(alertFund)}>
                    确认
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 数据获取失败提示 */}
        {errorCount > 0 && (
          <FadeIn className="mb-4" delay={0.12}>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <AlertTriangle className="size-4 text-amber-500" />
                <span className="text-sm">{errorCount} 只基金数据获取失败，已自动降级显示</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    _setRetryCount((c) => c + 1);
                    void handleRefresh();
                  }}
                >
                  重试
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 搜索栏 */}
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

        {/* 分类筛选 */}
        <FadeIn className="mb-4 flex items-center gap-2" delay={0.15}>
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

        {/* 估值表格 */}
        <FadeIn delay={0.2}>
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
                        label="类型"
                        field="categoryLabel"
                        current={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <ThSortableCell
                        label="实时估值"
                        field="estimatedNav"
                        current={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <ThSortableCell
                        label="估算涨幅"
                        field="estimatedChange"
                        current={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <ThSortableCell
                        label="最新净值"
                        field="actualNav"
                        current={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <ThSortableCell
                        label="估值偏差"
                        field="deviation"
                        current={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <ThSortableCell
                        label="净值日期"
                        field="navDate"
                        current={sortField}
                        dir={sortDir}
                        onSort={toggleSort}
                      />
                      <ThCell>预警</ThCell>
                      <ThCell>走势</ThCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((fund) => (
                      <ValuationRow
                        key={fund.code}
                        fund={fund}
                        hasAlert={alerts.some((a) => a.code === fund.code)}
                        isAlertTriggered={triggeredAlerts.has(fund.code)}
                        onAddAlert={() => {
                          setAlertFund(fund);
                          setAlertThreshold(2);
                          setAlertDirection("both");
                        }}
                        isExpanded={expandedCode === fund.code}
                        onToggleExpand={() => toggleExpand(fund.code)}
                        historyData={expandedCode === fund.code ? historyData : []}
                        historyLoading={historyLoading && expandedCode === fund.code}
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

        <p className="mt-6 text-center text-xs text-muted-foreground">
          估值数据仅供参考，不构成投资建议。估值基于基金持仓和指数走势估算，可能与实际净值存在偏差。
        </p>
      </main>
    </div>
  );
}

/* ==================== Header ==================== */

function Header() {
  return (
    <motion.header
      className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
    >
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
        <span className="font-medium">QDII 估值</span>
      </div>
    </motion.header>
  );
}

/* ==================== 表格组件 ==================== */

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

/** 估值表格行 */
function ValuationRow({
  fund,
  hasAlert,
  isAlertTriggered,
  onAddAlert,
  isExpanded,
  onToggleExpand,
  historyData,
  historyLoading,
}: {
  fund: QDIIValuationData;
  hasAlert: boolean;
  isAlertTriggered: boolean;
  onAddAlert: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  historyData: Array<{
    date: string;
    estimatedNav: number;
    actualNav: number | null;
    estimatedChange: number;
  }>;
  historyLoading: boolean;
}) {
  const isUp = fund.estimatedChange > 0;
  const isDown = fund.estimatedChange < 0;
  const changeColor = isUp ? "text-red-500" : isDown ? "text-emerald-500" : "";

  // 偏差颜色：偏差越大越醒目
  const deviationColor =
    fund.deviation === null
      ? ""
      : Math.abs(fund.deviation) >= 1
        ? "text-amber-500 font-medium"
        : Math.abs(fund.deviation) >= 0.5
          ? "text-amber-400"
          : "";

  return (
    <>
      <tr
        className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${
          fund.error ? "opacity-50" : ""
        } ${isAlertTriggered ? "bg-amber-500/5" : ""}`}
      >
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
        <td className="py-2.5 px-3 text-right">
          {fund.estimatedNav > 0 ? (
            <span className="font-medium">{fund.estimatedNav.toFixed(4)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right">
          {fund.error ? (
            <span className="text-xs text-muted-foreground">获取失败</span>
          ) : fund.estimatedNav > 0 ? (
            <span className={`flex items-center justify-end gap-0.5 ${changeColor}`}>
              {isUp ? (
                <TrendingUp className="size-3" />
              ) : isDown ? (
                <TrendingDown className="size-3" />
              ) : null}
              {fund.estimatedChange > 0 ? "+" : ""}
              {fund.estimatedChange.toFixed(2)}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right">
          {fund.actualNav !== null && fund.actualNav > 0 ? (
            <span>{fund.actualNav.toFixed(4)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right">
          {fund.deviation !== null ? (
            <span className={deviationColor}>
              {fund.deviation > 0 ? "+" : ""}
              {fund.deviation.toFixed(2)}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
          {fund.navDate ? fund.navDate.slice(5) : "—"}
        </td>
        <td className="py-2.5 px-3 text-center">
          <button
            onClick={onAddAlert}
            className={`inline-flex items-center justify-center rounded-sm p-1 transition-colors hover:bg-primary/10 ${
              hasAlert ? "text-amber-500" : "text-muted-foreground hover:text-primary"
            }`}
            title={hasAlert ? "已设置预警，点击修改" : "设置预警"}
          >
            {hasAlert ? <BellRing className="size-3.5" /> : <Bell className="size-3.5" />}
          </button>
        </td>
        <td className="py-2.5 px-3 text-center">
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center justify-center rounded-sm p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            title="查看走势"
          >
            <Eye className="size-3.5" />
          </button>
        </td>
      </tr>
      {/* 展开的走势图行 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            key={`expand-${fund.code}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
          >
            <td colSpan={10} className="border-b bg-muted/20 px-4 py-3">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
                </div>
              ) : historyData.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      近30日净值走势
                    </span>
                    <Link
                      to={`/fund/${fund.code}`}
                      className="text-xs text-primary hover:underline"
                    >
                      查看完整分析 →
                    </Link>
                  </div>
                  <ValuationTrendChart data={historyData} />
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">暂无历史数据</p>
              )}
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

/* ==================== 估值走势图（纯 SVG） ==================== */

function ValuationTrendChart({
  data,
}: {
  data: Array<{
    date: string;
    estimatedNav: number;
    actualNav: number | null;
    estimatedChange: number;
  }>;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length < 2) return <p className="text-sm text-muted-foreground">数据不足</p>;

  const navs = data.map((d) => d.estimatedNav).filter((n) => n > 0);
  if (navs.length < 2) return <p className="text-sm text-muted-foreground">数据不足</p>;

  const minNav = Math.min(...navs);
  const maxNav = Math.max(...navs);
  const range = maxNav - minNav || 0.01;

  const width = 700;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 25, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 计算坐标
  const coords = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.estimatedNav - minNav) / range) * chartH;
    return { x, y, ...d };
  });

  // 路径
  const points = coords.map((c) => `${c.x},${c.y}`);
  const linePath = `M${points[0]} L${points.slice(1).join(" L")}`;
  const areaPath = `M${points[0]} L${points.slice(1).join(" L")} L${padding.left + chartW},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  const isUp = navs[navs.length - 1] >= navs[0];
  const lineColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = isUp ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";

  // Y轴刻度
  const yTicks = Array.from({ length: 3 }, (_, i) => {
    const val = minNav + (range * i) / 2;
    const y = padding.top + chartH - ((val - minNav) / range) * chartH;
    return { val: val.toFixed(4), y };
  });

  // X轴标签
  const firstYear = data[0].date.slice(0, 4);
  const lastYear = data[data.length - 1].date.slice(0, 4);
  const crossYear = firstYear !== lastYear;
  const fmtDate = (d: string) => (crossYear ? d.slice(2) : d.slice(5));
  const xLabels = [
    { text: fmtDate(data[0].date), x: padding.left },
    { text: fmtDate(data[Math.floor(data.length / 2)].date), x: padding.left + chartW / 2 },
    { text: fmtDate(data[data.length - 1].date), x: padding.left + chartW },
  ];

  // 悬浮数据点
  const active = hoverIdx !== null ? coords[hoverIdx] : null;

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
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={(e) => setHoverIdx(findClosest(e.clientX, e.currentTarget))}
        onPointerLeave={() => setHoverIdx(null)}
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

        {/* 悬浮数据点 */}
        {active && (
          <>
            <line
              x1={active.x}
              y1={padding.top}
              x2={active.x}
              y2={padding.top + chartH}
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeDasharray="4 2"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4}
              fill={lineColor}
              stroke="#fff"
              strokeWidth={2}
            />
            {/* Tooltip */}
            {(() => {
              const tipW = 140;
              const tipH = 48;
              const tipX = active.x + 12 + tipW > width ? active.x - tipW - 12 : active.x + 12;
              const tipY = Math.max(
                padding.top,
                Math.min(active.y - tipH / 2, padding.top + chartH - tipH),
              );
              return (
                <g>
                  <rect
                    x={tipX}
                    y={tipY}
                    width={tipW}
                    height={tipH}
                    rx={6}
                    fill="hsl(var(--popover))"
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                  />
                  <text x={tipX + 8} y={tipY + 16} fontSize={10} className="fill-muted-foreground">
                    {active.date}
                  </text>
                  <text x={tipX + 8} y={tipY + 36} fontSize={13} fontWeight="bold" fill={lineColor}>
                    {active.estimatedNav.toFixed(4)}
                  </text>
                  <text
                    x={tipX + tipW - 8}
                    y={tipY + 36}
                    fontSize={11}
                    textAnchor="end"
                    fill={active.estimatedChange >= 0 ? "#10b981" : "#ef4444"}
                  >
                    {active.estimatedChange >= 0 ? "+" : ""}
                    {active.estimatedChange.toFixed(2)}%
                  </text>
                </g>
              );
            })()}
          </>
        )}

        {/* Y轴刻度 */}
        {yTicks.map((tick) => (
          <text
            key={tick.val}
            x={padding.left - 5}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
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
            fontSize={9}
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
    </div>
  );
}
