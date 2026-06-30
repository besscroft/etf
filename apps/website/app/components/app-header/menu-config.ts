/**
 * 主菜单配置
 *
 * 在此集中维护全站导航项，新增/调整菜单只需改动本文件。
 *
 * ─────────────────────────────────────────────
 * 新增菜单项指引
 * ─────────────────────────────────────────────
 * 1. key：唯一标识，用于高亮匹配（建议英文短词）
 * 2. label：显示文案
 * 3. href：跳转路径
 * 4. icon：Lucide 图标组件，桌面/移动端通用
 * 5. matchPaths（可选）：当一个菜单项覆盖多条路由时登记额外路径
 *    - 例：场外基金同时覆盖 /otc-funds 和 /otc-fund
 *    - 路径匹配采用最长前缀优先，避免 /otc-fund 误匹配到 /otc-funds
 * 6. hidden（可选）：是否在导航中隐藏（仍可通过 href 直接访问）
 * ─────────────────────────────────────────────
 *
 * 未来扩展点：
 * - children?: MenuItem[]（多级菜单）— 见 types.ts 扩展点说明
 * - permission?: string（权限控制）— 见 types.ts 扩展点说明
 */
import { Activity, BarChart3, Home, TrendingUp, Wallet } from "lucide-react";
import type { MenuItem } from "./types";

export const mainMenu: MenuItem[] = [
  { key: "home", label: "首页", href: "/", icon: Home },
  { key: "nasdaq", label: "纳指被动", href: "/nasdaq", icon: TrendingUp },
  { key: "sp500", label: "标普500", href: "/sp500", icon: Activity },
  { key: "active", label: "美股主动", href: "/active", icon: BarChart3 },
  {
    key: "otc",
    label: "场外基金",
    href: "/otc-funds",
    icon: Wallet,
    // 「场外基金」入口覆盖对比/详情/旧 cn/ 路径，全部归到同一高亮项
    matchPaths: ["/otc-funds", "/otc-fund", "/cn/funds", "/cn/fund"],
  },
];
