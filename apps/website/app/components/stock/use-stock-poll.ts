/**
 * 股票实时价轮询 hook
 *
 * 设计动机：交易时段用户期望看到价格跳动，但页面不能高频打源站。
 *
 * 行为：
 * - 初始立即拉一次（不延迟）
 * - 之后每 intervalMs 拉一次
 * - 页面隐藏（document.visibilityState !== "visible"）时停掉
 *   - 切回可见时立即拉一次（不延迟），恢复节奏
 * - 组件卸载时清掉定时器
 *
 * 用法：
 * ```tsx
 * const quote = useStockPoll("600519", 15_000);
 * // quote.price / quote.changePercent 自动更新
 * ```
 */

import { useEffect, useState } from "react";

import { getStockQuote, type StockQuote } from "~/lib/stock-data";

export function useStockPoll(code: string, intervalMs = 15_000): StockQuote | null {
  const [quote, setQuote] = useState<StockQuote | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        // 不可见：跳过这次轮询，等会儿再试
        scheduleNext();
        return;
      }
      try {
        const fresh = await getStockQuote(code, { bypassCache: true });
        if (!cancelled && fresh) setQuote(fresh);
      } catch {
        // 静默：轮询失败不打扰用户
      }
      scheduleNext();
    };

    const scheduleNext = () => {
      if (cancelled) return;
      timer = setTimeout(tick, intervalMs);
    };

    // 首次立即拉
    void tick();

    // 页面可见性切换时立即拉一次
    const onVisibilityChange = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void tick();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [code, intervalMs]);

  return quote;
}
