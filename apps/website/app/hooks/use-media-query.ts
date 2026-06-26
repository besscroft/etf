/**
 * useMediaQuery 媒体查询 hook
 *
 * 用于在客户端根据 CSS 媒体查询切换布局/交互。
 * - SSR 安全：服务端始终返回 false，避免 hydration 不一致
 * - 监听变化自动同步状态
 *
 * 使用示例：
 *   const isMobile = useMediaQuery("(max-width: 768px)");
 */
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    // 同步当前值
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** 移动端断点：与设计稿一致，覆盖 320px–480px 范围 */
export const useIsMobile = (): boolean => useMediaQuery("(max-width: 768px)");
