/**
 * 股票实时报价卡片（2026-07-03 新增）
 *
 * - 顶部：代码 + 名称 + 市场标签
 * - 中部：大字号当前价（数字变化时短暂闪动）
 * - 下部：涨跌额 / 涨跌幅 / 最高 / 最低 / 开盘 / 昨收 / 成交量 / 成交额
 */

import * as React from "react";
import { TrendingDown, TrendingUp, Activity } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { StockQuote } from "~/lib/stock-data";

interface StockQuoteCardProps {
  quote: StockQuote | null;
}

export function StockQuoteCard({ quote }: StockQuoteCardProps) {
  // 数字变化时短暂闪动：记录上一次价格，新值时加高亮 class
  const prevPriceRef = React.useRef<number>(0);
  const [flash, setFlash] = React.useState<"up" | "down" | null>(null);

  React.useEffect(() => {
    if (!quote || quote.price === 0) return;
    const prev = prevPriceRef.current;
    if (prev !== 0 && quote.price !== prev) {
      setFlash(quote.price > prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prevPriceRef.current = quote.price;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = quote.price;
    return undefined;
  }, [quote?.price]);

  if (!quote || quote.price === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          暂无实时行情
        </CardContent>
      </Card>
    );
  }

  const up = quote.changePercent > 0;
  const down = quote.changePercent < 0;
  const colorClass = up ? "text-red-500" : down ? "text-emerald-500" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="py-5">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="font-mono text-sm text-muted-foreground">{quote.code}</span>
          <span className="text-base font-semibold">{quote.name || quote.code}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {quote.marketLabel}
          </span>
          {quote.timestamp > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              {new Date(quote.timestamp).toLocaleTimeString("zh-CN", { hour12: false })}
            </span>
          )}
        </div>

        <div className="mb-4 flex items-end gap-3">
          <span
            className={cn(
              "text-3xl font-bold tabular-nums transition-colors duration-300 md:text-4xl",
              colorClass,
              flash === "up" && "bg-red-50 dark:bg-red-950/30",
              flash === "down" && "bg-emerald-50 dark:bg-emerald-950/30",
              flash && "px-1.5 py-0.5 rounded",
            )}
          >
            {quote.price.toFixed(2)}
          </span>
          <div className={cn("flex flex-col text-sm", colorClass)}>
            <span className="flex items-center gap-1 font-medium tabular-nums">
              {up ? (
                <TrendingUp className="size-3.5" />
              ) : down ? (
                <TrendingDown className="size-3.5" />
              ) : (
                <Activity className="size-3.5" />
              )}
              {quote.change >= 0 ? "+" : ""}
              {quote.change.toFixed(2)}
            </span>
            <span className="font-semibold tabular-nums">
              {quote.changePercent >= 0 ? "+" : ""}
              {quote.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <Stat label="今开" value={quote.open > 0 ? quote.open.toFixed(2) : "—"} />
          <Stat label="昨收" value={quote.prevClose > 0 ? quote.prevClose.toFixed(2) : "—"} />
          <Stat label="最高" value={quote.high > 0 ? quote.high.toFixed(2) : "—"} />
          <Stat label="最低" value={quote.low > 0 ? quote.low.toFixed(2) : "—"} />
          <Stat label="成交量" value={quote.volume > 0 ? formatVolume(quote.volume) : "—"} />
          <Stat label="成交额" value={quote.turnover > 0 ? formatAmount(quote.turnover) : "—"} />
          <Stat
            label="振幅"
            value={
              quote.open > 0
                ? `${(((quote.high - quote.low) / quote.open) * 100).toFixed(2)}%`
                : "—"
            }
          />
          <Stat label="换手率" value="—" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed py-1 last:border-0 sm:border-0 sm:py-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** 成交量（手）→ 万手 / 亿手 */
function formatVolume(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)}亿手`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(2)}万手`;
  return `${v.toFixed(0)}手`;
}

/** 成交额（元）→ 万 / 亿 */
function formatAmount(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)}亿元`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(2)}万元`;
  return `${v.toFixed(0)}元`;
}
