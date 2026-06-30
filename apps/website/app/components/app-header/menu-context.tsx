/**
 * 菜单 Context
 *
 * 集中维护菜单的运行时状态：
 * - mobileOpen：移动端菜单展开/收起
 * - currentKey/currentLabel：当前路由对应的高亮项（由 useCurrentRouteKey 推导）
 *
 * 路由变化时自动 closeMobile，避免移动端菜单跨页保持展开。
 *
 * ─────────────────────────────────────────────
 * 未来如何接入 permission（占位说明）
 * ─────────────────────────────────────────────
 * 1. MenuProvider 增加 prop：`user?: User; permissions?: string[]`
 * 2. 在 value 中计算 `isPermitted(item) => boolean`
 * 3. 暴露给消费方：`usePermission` hook
 * 4. use-visible-items.ts 中叠加 isPermitted 判定
 * 5. 路由级权限拦截：可在 MenuProvider 内 useEffect 监听 pathname +
 *    permissions 组合，必要时 push 到无权限页
 * ─────────────────────────────────────────────
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import type { MenuContextValue, MenuItem } from "./types";
import { useCurrentRouteKey } from "./use-current-route-key";

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export function MenuProvider({
  config,
  children,
}: {
  config: MenuItem[];
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { key: currentKey, label: currentLabel } = useCurrentRouteKey(config);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const value = useMemo<MenuContextValue>(
    () => ({
      config,
      currentKey,
      currentLabel,
      mobileOpen,
      toggleMobile: () => setMobileOpen((v) => !v),
      closeMobile: () => setMobileOpen(false),
    }),
    [config, currentKey, currentLabel, mobileOpen],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenuContext(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error("useMenuContext must be used within a MenuProvider");
  }
  return ctx;
}
