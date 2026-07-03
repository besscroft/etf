/**
 * 基金持仓股票表格（2026-07-03 新增）
 *
 * 替代原 fund.$code.tsx 里的"重仓股行情"区块，支持：
 * - 默认显示前 N 只（initialVisible）+ 「查看全部 / 收起」切换
 * - 搜索：按代码 / 名称模糊匹配（200ms 防抖）
 * - 排序：列点击切换 asc / desc / 默认
 * - 行点击：跳转 /stock/:code（A 股） / 占位提示（其他）
 *
 * 状态与 props：
 * - 受控：holdings + total 由父组件传入
 * - 内部状态：展开 / 搜索 / 排序 / 当前页（仅展开时生效）
 */

import * as React from "react";
import { useNavigate } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Search } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** 持仓股票行（与 FundHeavyData.topHoldings 元素对应） */
export interface HoldingRow {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  holdingRatio: number;
  shareCount: number | null;
}

interface HoldingsTableProps {
  holdings: HoldingRow[];
  /** 基金总持仓数（holdings 可能是 top 10；total 用于「显示全部 X 只」提示） */
  total: number;
  /** 默认展示行数（折叠态）；展开后展示所有 */
  initialVisible?: number;
  /** 分页大小（展开后使用） */
  pageSize?: number;
}

type SortKey = "symbol" | "name" | "holdingRatio" | "shareCount" | "price" | "changePercent";
type SortDir = "asc" | "desc" | null;

const SORT_LABELS: Record<SortKey, string> = {
  symbol: "代码",
  name: "名称",
  holdingRatio: "持仓占比",
  shareCount: "持股数",
  price: "最新价",
  changePercent: "涨跌幅",
};

export function HoldingsTable({
  holdings,
  total,
  initialVisible = 10,
  pageSize = 50,
}: HoldingsTableProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>(null);
  const [page, setPage] = React.useState(1);

  // 200ms 防抖：避免每个键击都重渲染
  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 搜索后回到第 1 页
  React.useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir]);

  /** A 股 6 位数字代码 = 可跳转股票详情 */
  const isClickable = (symbol: string) => /^\d{6}$/.test(symbol);

  const onRowClick = (symbol: string) => {
    if (!isClickable(symbol)) return;
    void navigate(`/stock/${symbol}`);
  };

  // 过滤 + 排序
  const filtered = React.useMemo(() => {
    let list = holdings;
    if (search) {
      list = list.filter(
        (h) => h.symbol.toLowerCase().includes(search) || h.name.toLowerCase().includes(search),
      );
    }
    if (sortKey && sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv), "zh") * dir;
      });
    }
    return list;
  }, [holdings, search, sortKey, sortDir]);

  // 决定展示哪些行
  const visibleRows = React.useMemo(() => {
    if (!expanded) return filtered.slice(0, initialVisible);
    return filtered.slice(0, page * pageSize);
  }, [filtered, expanded, page, initialVisible, pageSize]);

  const hasMore = expanded
    ? filtered.length > visibleRows.length
    : filtered.length > initialVisible;

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-1 inline size-3 opacity-50" />;
    if (sortDir === "asc") return <ArrowUp className="ml-1 inline size-3" />;
    return <ArrowDown className="ml-1 inline size-3" />;
  };

  if (holdings.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">暂无持仓数据</p>;
  }

  return (
    <div className="space-y-3">
      {/* 工具栏：搜索 + 计数 + 展开/收起 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索代码或名称"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {search && filtered.length !== holdings.length && (
            <span>
              匹配 {filtered.length} / {holdings.length} 只
            </span>
          )}
          <span>共 {total || holdings.length} 只持仓</span>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <SortableTh
                label={SORT_LABELS.symbol}
                onClick={() => handleSort("symbol")}
                align="left"
              >
                {sortIcon("symbol")}
              </SortableTh>
              <SortableTh label={SORT_LABELS.name} onClick={() => handleSort("name")} align="left">
                {sortIcon("name")}
              </SortableTh>
              <SortableTh
                label={SORT_LABELS.holdingRatio}
                onClick={() => handleSort("holdingRatio")}
                align="right"
              >
                {sortIcon("holdingRatio")}
              </SortableTh>
              <SortableTh
                label={SORT_LABELS.shareCount}
                onClick={() => handleSort("shareCount")}
                align="right"
              >
                {sortIcon("shareCount")}
              </SortableTh>
              <SortableTh
                label={SORT_LABELS.price}
                onClick={() => handleSort("price")}
                align="right"
              >
                {sortIcon("price")}
              </SortableTh>
              <SortableTh
                label={SORT_LABELS.changePercent}
                onClick={() => handleSort("changePercent")}
                align="right"
              >
                {sortIcon("changePercent")}
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  没有匹配的持仓
                </td>
              </tr>
            ) : (
              visibleRows.map((h) => {
                const clickable = isClickable(h.symbol);
                return (
                  <tr
                    key={h.symbol}
                    onClick={() => onRowClick(h.symbol)}
                    className={cn(
                      "border-b last:border-0",
                      clickable && "cursor-pointer transition-colors hover:bg-muted/40",
                    )}
                  >
                    <td className="py-2 font-mono text-xs">{h.symbol}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span>{h.name || h.symbol}</span>
                        {!clickable && (
                          <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                            {h.symbol.length === 5 ? "港股" : "美股"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      {h.holdingRatio > 0 ? (
                        <span className="font-medium">{h.holdingRatio.toFixed(2)}%</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {h.shareCount != null ? formatShareCount(h.shareCount) : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {h.price > 0 ? (
                        /^\d{6}$/.test(h.symbol) && h.symbol.startsWith("5") ? (
                          `¥${h.price.toFixed(3)}`
                        ) : (
                          `¥${h.price.toFixed(2)}`
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={cn(
                          h.changePercent > 0
                            ? "text-red-500"
                            : h.changePercent < 0
                              ? "text-emerald-500"
                              : "text-muted-foreground",
                        )}
                      >
                        {h.changePercent > 0 ? "+" : ""}
                        {h.changePercent.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 展开/收起/分页 */}
      {hasMore && !search && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!expanded) {
                setExpanded(true);
              } else {
                setPage((p) => p + 1);
              }
            }}
          >
            <ChevronDown className="mr-1 size-3" />
            {expanded
              ? `加载更多（还有 ${filtered.length - visibleRows.length} 只）`
              : `展开全部 ${filtered.length} 只持仓`}
          </Button>
        </div>
      )}
      {expanded && !hasMore && filtered.length > pageSize && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setExpanded(false);
              setPage(1);
            }}
          >
            <ChevronUp className="mr-1 size-3" />
            收起
          </Button>
        </div>
      )}
    </div>
  );
}

function SortableTh({
  label,
  onClick,
  align,
  children,
}: {
  label: string;
  onClick: () => void;
  align: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "pb-2 font-medium select-none cursor-pointer hover:text-foreground",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {label}
      {children}
    </th>
  );
}

/** 持股数格式化：万股 → 万 / 亿 */
function formatShareCount(shares: number): string {
  if (!Number.isFinite(shares) || shares <= 0) return "—";
  if (shares >= 10_000) {
    return `${(shares / 10_000).toFixed(2)}亿股`;
  }
  return `${shares.toFixed(2)}万股`;
}
