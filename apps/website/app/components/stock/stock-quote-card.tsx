import * as React from "react";
import { Activity, Clock3, Database, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  formatAmount,
  formatPercent,
  formatPrice,
  formatVolume,
  trendClass,
} from "~/lib/format-ashare";
import { buildMarketDataMeta } from "~/lib/stock-market";
import type { StockQuote } from "~/lib/stock-data";

interface StockQuoteCardProps {
  quote: StockQuote | null;
}

const SOURCE_LABEL = {
  eastmoney: "东方财富",
  sina: "新浪行情",
  unavailable: "数据不可用",
} as const;

const FRESHNESS_LABEL = {
  live: "实时",
  delayed: "延迟",
  stale: "已过期",
  unavailable: "不可用",
} as const;

export function StockQuoteCard({ quote }: StockQuoteCardProps) {
  const previousPrice = React.useRef<number | null>(null);
  const [flash, setFlash] = React.useState<"up" | "down" | null>(null);

  React.useEffect(() => {
    const price = quote?.price ?? null;
    if (price === null) return;
    const previous = previousPrice.current;
    previousPrice.current = price;
    if (previous === null || previous === price) return;
    setFlash(price > previous ? "up" : "down");
    const timer = window.setTimeout(() => setFlash(null), 450);
    return () => window.clearTimeout(timer);
  }, [quote?.price]);

  if (!quote || quote.price === null) {
    return (
      <section className="market-panel flex min-h-44 items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">实时行情暂不可用</p>
        </div>
      </section>
    );
  }

  const change = quote.change ?? 0;
  const changePercent = quote.changePercent ?? 0;
  const up = changePercent > 0;
  const down = changePercent < 0;
  const meta = buildMarketDataMeta({
    source: quote.source,
    sourceTimestamp: quote.timestamp,
  });
  const validRange = quote.high !== null && quote.low !== null && quote.prevClose !== null;
  const amplitude =
    validRange && quote.prevClose !== null && quote.prevClose > 0
      ? ((quote.high! - quote.low!) / quote.prevClose) * 100
      : null;

  return (
    <section className="market-panel overflow-hidden">
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{quote.code}</span>
              <span className="text-base font-semibold">{quote.name || quote.code}</span>
              <span className="market-tag">{quote.marketLabel}</span>
            </div>
            <div className="mt-2 flex items-end gap-3">
              <span
                className={cn(
                  "font-mono text-4xl font-semibold leading-none tabular-nums transition-colors sm:text-5xl",
                  trendClass(changePercent),
                  flash === "up" && "text-[color:var(--market-up-bright)]",
                  flash === "down" && "text-[color:var(--market-down-bright)]",
                )}
              >
                {formatPrice(quote.price)}
              </span>
              <div className={cn("pb-0.5 font-mono text-sm", trendClass(changePercent))}>
                <span className="flex items-center gap-1">
                  {up ? (
                    <TrendingUp className="size-3.5" />
                  ) : down ? (
                    <TrendingDown className="size-3.5" />
                  ) : (
                    <Activity className="size-3.5" />
                  )}
                  {change > 0 ? "+" : ""}
                  {change.toFixed(2)}
                </span>
                <span className="mt-0.5 block font-semibold">{formatPercent(changePercent)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Database className="size-3" />
              {SOURCE_LABEL[quote.source]} · {FRESHNESS_LABEL[meta.freshness]}
            </span>
            {quote.timestamp ? (
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Clock3 className="size-3" />
                {new Date(quote.timestamp).toLocaleTimeString("zh-CN", { hour12: false })}
              </span>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-4 gap-x-4 gap-y-3 border-t border-border/70 pt-4 text-xs lg:grid-cols-8">
          <QuoteStat label="今开" value={formatPrice(quote.open)} />
          <QuoteStat label="昨收" value={formatPrice(quote.prevClose)} />
          <QuoteStat label="最高" value={formatPrice(quote.high)} tone={quote.high} />
          <QuoteStat label="最低" value={formatPrice(quote.low)} tone={quote.low} />
          <QuoteStat label="成交量" value={formatVolume(quote.volume)} />
          <QuoteStat label="成交额" value={formatAmount(quote.turnover)} />
          <QuoteStat label="换手率" value={formatPercent(quote.turnoverRate, false)} />
          <QuoteStat label="振幅" value={formatPercent(amplitude, false)} />
        </dl>
      </div>
    </section>
  );
}

function QuoteStat({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn("mt-1 truncate font-mono text-sm font-medium", tone ? trendClass(tone) : "")}
      >
        {value}
      </dd>
    </div>
  );
}
