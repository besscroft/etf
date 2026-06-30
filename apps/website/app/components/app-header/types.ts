/**
 * AppHeader 组件相关类型定义
 *
 * 菜单配置驱动的设计：
 * - MenuItem 通过 menu-config.ts 注册到 mainMenu
 * - AppHeaderProps 控制当前页的呈现（面包屑、滚动行为）
 * - MenuContextValue 暴露给消费组件的状态/操作
 *
 * ─────────────────────────────────────────────
 * 未来扩展点（本次未实现，仅作接口预留指引）
 * ─────────────────────────────────────────────
 * 1. 多级菜单嵌套
 *    - 在 MenuItem 增加 `children?: MenuItem[]` 字段
 *    - `use-current-route-key.ts` 的候选路径需递归展开
 *    - `desktop-nav.tsx` / `mobile-nav.tsx` 需递归渲染
 *    - `use-visible-items.ts` 的过滤需改为递归（hidden 子树整体不显示）
 *
 * 2. 权限控制集成
 *    - 在 MenuItem 增加 `permission?: string` 字段
 *    - `MenuProvider` 增加 `user/permissions` prop
 *    - 新增 `usePermission(predicate?)` hook
 *    - `use-visible-items.ts` 中叠加 usePermission 判定
 * ─────────────────────────────────────────────
 */
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  /** 唯一标识，用于高亮匹配 */
  key: string;
  /** 显示文案 */
  label: string;
  /** 跳转路径 */
  href: string;
  /** 菜单项图标（桌面/移动端通用） */
  icon?: LucideIcon;
  /**
   * 额外高亮匹配的路径集合。
   * 当一个菜单项对应多个路由时（如「场外基金」同时覆盖 /otc-funds 和 /otc-fund），
   * 把这些路径登记到 matchPaths，确保任意子路径都正确高亮该菜单项。
   * 路径匹配采用最长前缀优先，避免 /otc-fund 误匹配到 /otc-funds。
   */
  matchPaths?: string[];
  /** 是否在导航中隐藏（仍可通过 href 直接访问） */
  hidden?: boolean;
}

export interface MenuContextValue {
  /** 菜单配置 */
  config: MenuItem[];
  /** 当前路由匹配的菜单项 key（无匹配时为 null） */
  currentKey: string | null;
  /** 当前路由匹配的菜单项 label（同上） */
  currentLabel: string | null;
  /** 移动端菜单是否展开 */
  mobileOpen: boolean;
  /** 切换移动端菜单 */
  toggleMobile: () => void;
  /** 关闭移动端菜单（路由切换时自动调用） */
  closeMobile: () => void;
}

export interface AppHeaderProps {
  /**
   * 子页面当前页标识。
   * 传入时在品牌旁显示「ETFVoid / {currentLabel}」面包屑；不传时只显示品牌。
   */
  currentLabel?: string;
  /**
   * 是否启用向下滚动隐藏 header。
   * 默认关闭——子页面内容多、用户通常希望导航常驻；
   * 顶层页面（如首页）若希望沉浸式浏览可开启。
   */
  enableScrollHide?: boolean;
}
