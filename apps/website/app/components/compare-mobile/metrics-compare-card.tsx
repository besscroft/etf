/**
 * MetricsCompareCard 移动端核心指标对比卡
 *
 * 采用「纵向卡片堆叠」替代桌面端横向表格：
 * - 每只基金一张卡片，左侧 4px 彩色色条
 * - 关键指标涨跌幅突出显示（大字号 + 色块）
 * - 长按卡片 500ms 弹出 ActionSheet（移除/置顶/取消）
 * - 卡片头部支持点击 ↕ 触发排序
 *
 * 可访问性：
 * - 涨跌色辅以 ▲/▼ 符号，不依赖颜色辨识
 * - 长按带触觉反馈（navigator.vibrate）
 */
import { useState, useRef, useMemo, type TouchEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, ArrowDown, Trash2, ArrowUpToLine, X } from "lucide-react";
import { DURATION, EASING } from "~/lib/motion";
import type { FundDetailData } from "~/lib/market-data";
import { getCompareColor } from "./constants";

interface MetricsCompareCardProps {
  funds: Array<FundDetailData & { error?: string }>;
  onRemove: (code: string) => void;
  /** 置顶（移到首位） */
  onPin?: (code: string) => void;
}

type SortKey = keyof Pick<FundDetailData, "changePercent" | "price" | "scale" | "fee">;
type SortDir = "asc" | "desc";

const LONG_PRESS_MS = 500;

export function MetricsCompareCard({ funds, onRemove, onPin }: MetricsCompareCardProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [actionTarget, setActionTarget] = useState<string | null>(null);

  // 排序
  const sortedFunds = useMemo(() => {
    if (!sortKey) return funds;
    return [...funds].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (sortKey === "scale" || sortKey === "fee") {
        // 字符串型数值：去除单位后比较
        const an = parseFloat(String(av)) || 0;
        const bn = parseFloat(String(bv)) || 0;
        return sortDir === "asc" ? an - bn : bn - an;
      }
      const an = typeof av === "number" ? av : 0;
      const bn = typeof bv === "number" ? bv : 0;
      return sortDir === "asc" ? an - bn : bn - an;
    });
  }, [funds, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-3">
      {/* 排序栏 */}
      <div className="flex items-center gap-1 overflow-x-auto px-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-muted-foreground">排序：</span>
        <SortChip
          label="涨跌幅"
          active={sortKey === "changePercent"}
          dir={sortDir}
          onClick={() => handleSort("changePercent")}
        />
        <SortChip
          label="净值"
          active={sortKey === "price"}
          dir={sortDir}
          onClick={() => handleSort("price")}
        />
        <SortChip
          label="规模"
          active={sortKey === "scale"}
          dir={sortDir}
          onClick={() => handleSort("scale")}
        />
        <SortChip
          label="费率"
          active={sortKey === "fee"}
          dir={sortDir}
          onClick={() => handleSort("fee")}
        />
        {sortKey && (
          <button
            onClick={() => {
              setSortKey(null);
              setSortDir("desc");
            }}
            className="shrink-0 px-2 py-1 text-muted-foreground"
          >
            清除
          </button>
        )}
      </div>

      {/* 基金卡片堆叠 */}
      <div className="space-y-2.5">
        {sortedFunds.map((fund, idx) => {
          const color = getCompareColor(funds.findIndex((f) => f.code === fund.code));
          return (
            <FundMetricCard
              key={fund.code}
              fund={fund}
              color={color.line}
              colorFill={color.fill}
              onLongPress={() => setActionTarget(fund.code)}
            />
          );
        })}
      </div>

      {/* 长按 ActionSheet */}
      <AnimatePresence>
        {actionTarget && (
          <ActionSheet
            onClose={() => setActionTarget(null)}
            actions={[
              onPin
                ? {
                    label: "置顶",
                    icon: <ArrowUpToLine className="size-4" />,
                    onClick: () => {
                      onPin(actionTarget);
                      setActionTarget(null);
                    },
                  }
                : null,
              {
                label: "移除",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onClick: () => {
                  onRemove(actionTarget);
                  setActionTarget(null);
                },
              },
            ].filter((a): a is NonNullable<typeof a> => a !== null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SortChip({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
      {active &&
        (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
    </button>
  );
}

function FundMetricCard({
  fund,
  color,
  colorFill,
  onLongPress,
}: {
  fund: FundDetailData & { error?: string };
  color: string;
  colorFill: string;
  onLongPress: () => void;
}) {
  const pressTimer = useRef<number | null>(null);
  const [pressed, setPressed] = useState(false);

  const startPress = () => {
    setPressed(true);
    pressTimer.current = window.setTimeout(() => {
      onLongPress();
      if (navigator.vibrate) navigator.vibrate(10);
      setPressed(false);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setPressed(false);
  };

  const change = fund.changePercent;
  const changeUp = change > 0;
  const changeDown = change < 0;

  if (fund.error) {
    return (
      <div
        className="relative overflow-hidden rounded-lg border bg-card p-3 text-sm text-destructive"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="font-medium">{fund.name}</div>
        <div className="mt-1 text-xs">数据加载失败：{fund.error}</div>
      </div>
    );
  }

  return (
    <motion.div
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onTouchCancel={cancelPress}
      animate={{ scale: pressed ? 0.98 : 1 }}
      transition={{ duration: DURATION.instant }}
      className="relative overflow-hidden rounded-lg border bg-card p-3"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* 长按提示 */}
      {pressed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
          长按中...
        </div>
      )}

      {/* 头部：名称 + 代码 */}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-semibold">{fund.name}</h3>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{fund.code}</span>
      </div>

      {/* 涨跌幅突出 */}
      <div
        className="mt-2 flex items-baseline gap-2 rounded-md px-2 py-1.5"
        style={{
          backgroundColor: changeUp
            ? "rgba(239,68,68,0.08)"
            : changeDown
              ? "rgba(16,185,129,0.08)"
              : "transparent",
        }}
      >
        <span className="text-xs text-muted-foreground">涨跌幅</span>
        <span
          className={`ml-auto text-lg font-bold ${
            changeUp ? "text-red-500" : changeDown ? "text-emerald-500" : ""
          }`}
        >
          {changeUp ? "▲" : changeDown ? "▼" : ""} {change > 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>

      {/* 其他指标 */}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Metric label="最新净值" value={fund.price > 0 ? `¥${fund.price.toFixed(4)}` : "—"} />
        <Metric label="基金规模" value={fund.scale || "—"} />
        <Metric label="管理费率" value={fund.fee || "—"} />
        <Metric label="跟踪指数" value={fund.index || "—"} />
      </dl>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

/** 底部 ActionSheet */
function ActionSheet({
  actions,
  onClose,
}: {
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
    onClick: () => void;
  }>;
  onClose: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.9 }}
        className="fixed inset-x-0 bottom-0 z-[105] rounded-t-2xl bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mx-auto mb-2 mt-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        <ul className="space-y-0.5">
          {actions.map((action, idx) => (
            <li key={idx}>
              <button
                onClick={action.onClick}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted ${
                  action.danger ? "text-destructive" : ""
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={onClose}
              className="mt-1 flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium hover:bg-muted"
            >
              <X className="size-4" /> 取消
            </button>
          </li>
        </ul>
      </motion.div>
    </>
  );
}
