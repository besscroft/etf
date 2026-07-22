/**
 * 个股盘口 + 资金流轮询 hook
 *
 * 复用 /api/a-share-detail 接口，按 intervalMs 后台刷新五档与资金流。
 * 初始值来自 loader（SSR 直出），轮询失败时静默保留旧值。
 */

import { useEffect, useState } from "react";

import type { MinutePoint, StockCapitalFlow, StockOrderBook } from "~/lib/stock-data";

interface DetailPollResult {
  orderBook: StockOrderBook | null;
  capitalFlow: StockCapitalFlow | null;
  minute: MinutePoint[] | null;
}

export function useStockDetailPoll(
  code: string,
  intervalMs = 10_000,
  initial?: DetailPollResult,
): DetailPollResult {
  const [state, setState] = useState<DetailPollResult>({
    orderBook: initial?.orderBook ?? null,
    capitalFlow: initial?.capitalFlow ?? null,
    minute: initial?.minute ?? null,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        scheduleNext();
        return;
      }
      try {
        const params = new URLSearchParams({ code, fields: "orderbook,capitalflow,minute" });
        const res = await fetch(`/api/a-share-detail?${params.toString()}`);
        if (!res.ok) throw new Error(`detail poll failed: ${res.status}`);
        const data = (await res.json()) as DetailPollResult;
        if (!cancelled) {
          setState((prev) => ({
            orderBook: data.orderBook ?? prev.orderBook,
            capitalFlow: data.capitalFlow ?? prev.capitalFlow,
            minute: data.minute ?? prev.minute,
          }));
        }
      } catch {
        // 静默
      }
      scheduleNext();
    };

    const scheduleNext = () => {
      if (cancelled) return;
      timer = setTimeout(tick, intervalMs);
    };

    void tick();

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void tick();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [code, intervalMs]);

  return state;
}
