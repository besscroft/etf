/**
 * MetricsCompare 自适应核心指标对比
 *
 * 1-2 只基金：每只基金一个 Card 网格（友好，大字号指标）
 * 3-4 只基金：表格（节省空间，列对比）
 *
 * 涨跌色：红涨绿跌（与中国股市惯例一致）
 * 错误处理：fund.error 时显示 N/A 视图
 */
import { Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Activity } from "lucide-react";
import { getCompareColor, MAX_COMPARE } from "~/components/compare-mobile/constants";
import type { FundDetailData } from "~/lib/market-data";

interface MetricsCompareProps {
  funds: Array<FundDetailData & { error?: string }>;
  onRemove: (code: string) => void;
}

/** 触发表格视图的阈值（>= 此值走表格，否则走卡片网格） */
const TABLE_THRESHOLD = 3;

export function MetricsCompare({ funds, onRemove }: MetricsCompareProps) {
  if (funds.length === 0) return null;

  if (funds.length < TABLE_THRESHOLD) {
    return <MetricsCardGrid funds={funds} onRemove={onRemove} />;
  }
  return <MetricsTable funds={funds} onRemove={onRemove} />;
}

/* ==================== 卡片网格（1-2 只） ==================== */

function MetricsCardGrid({ funds, onRemove }: MetricsCompareProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <Activity className="size-4 text-primary" />
          核心指标对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {funds.map((fund, idx) => {
            const color = getCompareColor(idx);
            return (
              <FundMetricCard
                key={fund.code}
                fund={fund}
                color={color.line}
                colorFill={color.fill}
                onRemove={() => onRemove(fund.code)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FundMetricCard({
  fund,
  color,
  colorFill,
  onRemove,
}: {
  fund: FundDetailData & { error?: string };
  color: string;
  colorFill: string;
  onRemove: () => void;
}) {
  const change = fund.changePercent;
  const changeUp = change > 0;
  const changeDown = change < 0;

  if (fund.error) {
    return (
      <div
        className="relative overflow-hidden rounded-lg border bg-card p-4"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{fund.name}</h3>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{fund.code}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`移除 ${fund.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <div
          className="mt-3 flex items-center gap-2 rounded-md px-2 py-2 text-xs text-destructive"
          style={{ backgroundColor: "rgba(239,68,68,0.06)" }}
        >
          <AlertCircle className="size-3.5 shrink-0" />
          数据加载失败：{fund.error}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-card p-4"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{fund.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{fund.code}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`移除 ${fund.name}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* 涨跌幅突出 */}
      <div
        className="mt-3 flex items-baseline justify-between gap-2 rounded-md px-3 py-2"
        style={{ backgroundColor: changeUp || changeDown ? colorFill : "transparent" }}
      >
        <span className="text-xs text-muted-foreground">涨跌幅</span>
        <span
          className={`text-2xl font-bold tabular-nums ${
            changeUp ? "text-red-500" : changeDown ? "text-emerald-500" : "text-foreground"
          }`}
        >
          {changeUp ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>

      {/* 其他指标 */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Metric label="最新净值" value={fund.price > 0 ? fund.price.toFixed(4) : "—"} />
        <Metric label="基金规模" value={fund.scale || "—"} />
        <Metric label="管理费率" value={fund.fee || "—"} />
        <Metric label="跟踪指数" value={fund.index || "—"} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/* ==================== 表格（3+ 只） ==================== */

function MetricsTable({ funds, onRemove }: MetricsCompareProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <Activity className="size-4 text-primary" />
          核心指标对比
          <span className="text-xs font-normal text-muted-foreground">
            （{funds.length}/{MAX_COMPARE}）
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">
                  指标
                </th>
                {funds.map((fund, idx) => {
                  const color = getCompareColor(idx);
                  return (
                    <th key={fund.code} className="min-w-[7rem] pb-2 pr-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color.line }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {fund.name}
                        </span>
                        <button
                          onClick={() => onRemove(fund.code)}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                          aria-label={`移除 ${fund.name}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <MetricRow label="基金代码" values={funds.map((f) => f.code)} />
              <MetricRow
                label="最新净值"
                values={funds.map((f) => (f.price > 0 ? f.price.toFixed(4) : "—"))}
              />
              <MetricRow label="涨跌幅" values={funds.map((f) => f.changePercent)} isChange />
              <MetricRow label="基金规模" values={funds.map((f) => f.scale || "—")} />
              <MetricRow label="管理费率" values={funds.map((f) => f.fee || "—")} />
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  values,
  isChange,
}: {
  label: string;
  values: Array<string | number>;
  isChange?: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">{label}</td>
      {values.map((val, idx) => {
        let className = "py-2.5 pr-1 text-sm tabular-nums";
        if (isChange) {
          const num = typeof val === "number" ? val : parseFloat(String(val));
          if (!isNaN(num)) {
            className += num > 0 ? " text-red-500" : num < 0 ? " text-emerald-500" : "";
          }
        }
        return (
          <td key={idx} className={className}>
            {isChange && typeof val === "number" ? (
              <span>
                {val > 0 ? "+" : ""}
                {val.toFixed(2)}%
              </span>
            ) : (
              String(val)
            )}
          </td>
        );
      })}
    </tr>
  );
}
