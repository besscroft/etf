/**
 * PerformanceBarsMobile 移动端阶段收益对比
 *
 * 桌面端使用固定宽度 w-20/w-16 在 320px 下会溢出，移动端改造：
 * - 标签 flex-shrink + min-w-0 + truncate，宽度自适应
 * - 条形 flex-1 + min-w-0，自动占满剩余空间
 * - 数值字号略小，避免挤压
 * - 每个周期独立计算 maxAbs，条形最大占 50% 宽度
 */
import { Trophy } from "lucide-react";
import type { FundDetailData } from "~/lib/market-data";
import { getCompareColor } from "./constants";

interface PerformanceBarsMobileProps {
  funds: Array<FundDetailData & { error?: string }>;
}

const PERIODS: Array<{ key: keyof FundDetailData["performance"]; label: string }> = [
  { key: "oneMonth", label: "近1月" },
  { key: "threeMonth", label: "近3月" },
  { key: "sixMonth", label: "近6月" },
  { key: "oneYear", label: "近1年" },
];

export function PerformanceBarsMobile({ funds }: PerformanceBarsMobileProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Trophy className="size-4 text-amber-500" />
        阶段收益对比
      </div>

      <div className="space-y-4">
        {PERIODS.map((period) => {
          const values = funds.map((f) => f.performance[period.key] ?? null);
          const nonNull = values.filter((v): v is number => v !== null);
          const maxAbs = nonNull.length > 0 ? Math.max(...nonNull.map(Math.abs), 1) : 1;

          return (
            <div key={period.key}>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">{period.label}</div>
              <div className="space-y-1.5">
                {funds.map((fund) => {
                  const val = fund.performance[period.key];
                  const colorIdx = funds.findIndex((f) => f.code === fund.code);
                  const color = getCompareColor(colorIdx);
                  const pct = val !== null ? (val / maxAbs) * 50 : 0;

                  return (
                    <div key={fund.code} className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color.line }}
                        aria-hidden="true"
                      />
                      <span className="w-12 shrink-0 truncate text-[11px] sm:w-16">
                        {fund.name}
                      </span>
                      <div className="relative h-4 min-w-0 flex-1">
                        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                        {val !== null && (
                          <div
                            className={`absolute top-0.5 h-3 rounded-sm ${
                              val >= 0 ? "bg-red-500/80" : "bg-emerald-500/80"
                            }`}
                            style={{
                              width: `${Math.abs(pct)}%`,
                              left: val >= 0 ? "50%" : `${50 - Math.abs(pct)}%`,
                            }}
                          />
                        )}
                      </div>
                      <span
                        className={`w-12 shrink-0 text-right text-[11px] font-medium tabular-nums ${
                          val === null
                            ? "text-muted-foreground"
                            : val > 0
                              ? "text-red-500"
                              : val < 0
                                ? "text-emerald-500"
                                : ""
                        }`}
                      >
                        {val !== null ? `${val > 0 ? "+" : ""}${val.toFixed(2)}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
