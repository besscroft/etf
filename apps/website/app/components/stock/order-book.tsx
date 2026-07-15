/**
 * 五档买卖盘组件（2026-07-15 新增）
 *
 * 展示 卖五→卖一 / 买一→买五 的价格、挂单量，并以横向柱长表示量能占比。
 * 红涨绿跌：卖盘用 market-up（红），买盘用 market-down（绿）。
 */

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatPrice, formatVolume, trendClass } from "~/lib/format-ashare";
import type { StockOrderBook } from "~/lib/stock-data";

interface OrderBookProps {
  book: StockOrderBook | null;
  loading?: boolean;
  /** 最新价，用于相邻档位高亮 */
  lastPrice?: number;
}

export function OrderBook({ book, loading, lastPrice }: OrderBookProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">五档买卖盘</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 py-2 text-center text-xs text-muted-foreground">
            盘口加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!book) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">五档买卖盘</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-xs text-muted-foreground">暂无盘口数据</div>
        </CardContent>
      </Card>
    );
  }

  const maxVolume = Math.max(
    1,
    ...book.asks.map((l) => l.volume),
    ...book.bids.map((l) => l.volume),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">五档买卖盘</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {/* 表头 */}
        <div className="grid grid-cols-3 px-4 pb-1 text-[11px] text-muted-foreground">
          <span>档位</span>
          <span className="text-right">价格（元）</span>
          <span className="text-right">挂单（手）</span>
        </div>

        {/* 卖盘 卖五→卖一（倒序展示，卖一贴近中间） */}
        <div className="divide-y divide-border/60">
          {[...book.asks].reverse().map((level, idx) => (
            <OrderRow
              key={`ask-${idx}`}
              label={`卖${5 - idx}`}
              level={level}
              side="ask"
              maxVolume={maxVolume}
            />
          ))}
        </div>

        {/* 最新价分隔 */}
        <div className="flex items-center justify-between border-y border-border bg-muted/40 px-4 py-1.5 text-sm">
          <span className="text-xs text-muted-foreground">最新</span>
          <span className={`font-mono font-semibold ${lastPrice ? trendClass(lastPrice) : ""}`}>
            {lastPrice ? formatPrice(lastPrice) : "—"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {book.timestamp > 0
              ? new Date(book.timestamp).toLocaleTimeString("zh-CN", { hour12: false })
              : ""}
          </span>
        </div>

        {/* 买盘 买一→买五 */}
        <div className="divide-y divide-border/60">
          {book.bids.map((level, idx) => (
            <OrderRow
              key={`bid-${idx}`}
              label={`买${idx + 1}`}
              level={level}
              side="bid"
              maxVolume={maxVolume}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderRow({
  label,
  level,
  side,
  maxVolume,
}: {
  label: string;
  level: { price: number; volume: number };
  side: "ask" | "bid";
  maxVolume: number;
}) {
  const barWidth = Math.min(100, (level.volume / maxVolume) * 100);
  const isAsk = side === "ask";
  const barColor = isAsk ? "bg-[color:var(--market-up)]/15" : "bg-[color:var(--market-down)]/15";
  const textColor = isAsk ? "text-[color:var(--market-up)]" : "text-[color:var(--market-down)]";

  return (
    <div className="relative grid grid-cols-3 items-center px-4 py-1 text-sm tabular-nums">
      {/* 量能背景柱（从右侧伸出） */}
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 ${barColor}`}
        style={{ width: `${barWidth}%` }}
      />
      <span className="relative z-10 text-xs text-muted-foreground">{label}</span>
      <span className={`relative z-10 text-right font-mono ${textColor}`}>
        {formatPrice(level.price)}
      </span>
      <span className="relative z-10 text-right font-mono text-muted-foreground">
        {formatVolume(level.volume)}
      </span>
    </div>
  );
}
