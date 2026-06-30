/**
 * AppHeader 组件统一导出
 *
 * ─────────────────────────────────────────────
 * 对外契约
 * ─────────────────────────────────────────────
 *
 * 业务侧推荐用法（路由页内）：
 *   import { AppHeader } from "~/components/app-header";
 *   <AppHeader currentLabel="基金对比" />
 *   <AppHeader currentLabel={fund.name} enableScrollHide />
 *
 * 一次性根挂载（root.tsx 内，只挂一次）：
 *   import { MenuProvider, mainMenu } from "~/components/app-header";
 *   <MenuProvider config={mainMenu}>{children}</MenuProvider>
 *
 * 工具：
 *   useMenuContext()         访问菜单状态/操作
 *   useCurrentRouteKey()     自定义场景下读取当前路由匹配
 *   useVisibleItems()        过滤 hidden 项后的菜单列表
 *
 * 类型：
 *   AppHeaderProps           组件 prop
 *   MenuContextValue         Context 值
 *   MenuItem                 单个菜单项
 *
 * ─────────────────────────────────────────────
 * 未来扩展点
 * ─────────────────────────────────────────────
 * - 多级菜单（MenuItem.children）— 详见 types.ts
 * - 权限控制（MenuItem.permission）— 详见 types.ts
 * ─────────────────────────────────────────────
 */
export { AppHeader } from "./app-header";
export { MenuProvider, useMenuContext } from "./menu-context";
export { mainMenu } from "./menu-config";
export { useCurrentRouteKey } from "./use-current-route-key";
export { useVisibleItems } from "./use-visible-items";
export type { AppHeaderProps, MenuContextValue, MenuItem } from "./types";
