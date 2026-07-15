/**
 * 下拉刷新 hook（移动端触摸手势）
 *
 * 在页面顶部（scrollTop === 0）向下拉动超过阈值时触发 onRefresh。
 * 仅处理 touch 事件，桌面端不受影响；尊重 prefers-reduced-motion。
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface PullToRefreshOptions {
  /** 触发刷新的下拉距离阈值（px） */
  threshold?: number;
  /** 最大可下拉距离（px），超过则不再增加位移 */
  maxDistance?: number;
  /** 刷新回调；返回 Promise 时会在完成后收起指示器 */
  onRefresh: () => void | Promise<void>;
  /** 是否启用（一般仅移动端启用） */
  enabled?: boolean;
}

export function usePullToRefresh({
  threshold = 64,
  maxDistance = 96,
  onRefresh,
  enabled = true,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const atTop = useCallback(() => {
    if (typeof window === "undefined") return false;
    const el = document.scrollingElement ?? document.documentElement;
    return (el?.scrollTop ?? 0) <= 0;
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) return;

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || !atTop()) return;
      if (event.touches.length !== 1) return;
      startY.current = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      if (!atTop()) {
        startY.current = null;
        return;
      }
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        if (distanceRef.current !== 0) {
          distanceRef.current = 0;
          setPullDistance(0);
        }
        return;
      }
      // 阻尼：越拉越重
      const damped = Math.min(maxDistance, delta * 0.5);
      distanceRef.current = damped;
      setPullDistance(damped);
    };

    const finish = async () => {
      if (refreshingRef.current || distanceRef.current < threshold) {
        distanceRef.current = 0;
        setPullDistance(0);
        startY.current = null;
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        distanceRef.current = 0;
        setPullDistance(0);
        startY.current = null;
      }
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      void finish();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, threshold, maxDistance, atTop]);

  return { pullDistance, refreshing };
}
