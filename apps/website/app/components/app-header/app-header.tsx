/**
 * AppHeader 路由布局组件
 *
 * 统一全站导航外观与行为：
 * - sticky 顶部 + 中性半透明背景
 * - 桌面端水平导航 / 移动端折叠菜单
 * - 自动高亮当前路由匹配的菜单项
 * - currentLabel 传入时附加「ETFVoid / {currentLabel}」面包屑
 *
 * ─────────────────────────────────────────────
 * 可选行为 / 扩展点
 * ─────────────────────────────────────────────
 * - currentLabel：子页面当前页标识（"基金对比" / 基金名称等）
 * - 未来可扩展：sticky 偏移（如下方有 fixed 工具栏）、注入 brand 节点
 * - 未来可扩展：children/slot 注入（如全局公告条、状态栏）
 * - 未来可扩展：基于路由前缀显示不同 brand 副本（"ETFVoid / 基金分析"）
 * ─────────────────────────────────────────────
 */
import { motion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { AppLink as Link } from "~/components/ui/link";
import { DURATION, DISTANCE, EASING } from "~/lib/motion";
import { ThemeMenu } from "~/components/theme";
import type { AppHeaderProps } from "./types";
import { DesktopNav } from "./desktop-nav";
import { MobileMenuButton, MobileMenuDropdown } from "./mobile-nav";

export function AppHeader({ currentLabel }: AppHeaderProps) {
  return (
    <motion.header
      className="sticky top-0 z-50 border-b bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/78"
      initial={{ y: -DISTANCE.md, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-5">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -DISTANCE.xs }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: DURATION.normal, ease: EASING.easeOut }}
        >
          <span className="flex size-8 items-center justify-center rounded-md border bg-card text-primary">
            <BarChart3 className="size-4" />
          </span>
          <Link to="/" className="text-base font-semibold tracking-tight hover:text-primary">
            ETFVoid
          </Link>
          {currentLabel ? (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{currentLabel}</span>
            </>
          ) : null}
        </motion.div>

        <div className="flex items-center gap-1">
          <DesktopNav />
          <ThemeMenu />
          <MobileMenuButton />
        </div>
      </div>
      <MobileMenuDropdown />
    </motion.header>
  );
}
