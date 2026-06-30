/**
 * AppHeader 路由布局组件
 *
 * 统一全站导航外观与行为：
 * - sticky 顶部 + menu-gradient-bg 渐变背景
 * - 桌面端水平导航 / 移动端折叠菜单
 * - 自动高亮当前路由匹配的菜单项
 * - currentLabel 传入时附加「ETFVoid / {currentLabel}」面包屑
 * - enableScrollHide 开启时支持向下滚动隐藏（仅顶层页面建议启用）
 *
 * ─────────────────────────────────────────────
 * 可选行为 / 扩展点
 * ─────────────────────────────────────────────
 * - currentLabel：子页面当前页标识（"基金对比" / 基金名称等）
 * - enableScrollHide：是否在向下滚动时隐藏（顶层页面沉浸式浏览用）
 * - 未来可扩展：sticky 偏移（如下方有 fixed 工具栏）、注入 brand 节点、
 *   brand 主题色与 menu-gradient-bg 的强弱联动
 * - 未来可扩展：children/slot 注入（如全局公告条、状态栏）
 * - 未来可扩展：基于路由前缀显示不同 brand 副本（"ETFVoid / 基金分析"）
 * ─────────────────────────────────────────────
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { AppLink as Link } from "~/components/ui/link";
import { DURATION, DISTANCE, EASING, useMotionConfig } from "~/lib/motion";
import type { AppHeaderProps } from "./types";
import { DesktopNav } from "./desktop-nav";
import { MobileMenuButton, MobileMenuDropdown } from "./mobile-nav";

export function AppHeader({ currentLabel, enableScrollHide = false }: AppHeaderProps) {
  const { shouldReduceMotion } = useMotionConfig();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // 向下滚动超过 8px 触发隐藏、向上同样阈值显示；
  // 顶部 60px 内始终保持显示，避免遮挡 hero 区域。
  useEffect(() => {
    if (!enableScrollHide) return;
    const handleScroll = () => {
      const y = window.scrollY;
      if (y < 60) {
        setHidden(false);
      } else if (y > lastScrollY.current + 8) {
        setHidden(true);
      } else if (y < lastScrollY.current - 8) {
        setHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enableScrollHide]);

  // reduced motion 或未启用滚动隐藏时，y 恒为 0
  const animateY = shouldReduceMotion || !enableScrollHide ? 0 : hidden ? -100 : 0;

  return (
    <motion.header
      className="sticky top-0 z-50 border-b menu-gradient-bg backdrop-blur-sm"
      initial={{ y: -DISTANCE.md, opacity: 0 }}
      animate={{ y: animateY, opacity: 1 }}
      transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
    >
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -DISTANCE.xs }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: DURATION.normal, ease: EASING.easeOut }}
        >
          <BarChart3 className="size-5 text-primary" />
          <Link to="/" className="text-lg font-semibold tracking-tight hover:underline">
            ETFVoid
          </Link>
          {currentLabel ? (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{currentLabel}</span>
            </>
          ) : null}
        </motion.div>

        <DesktopNav />
        <MobileMenuButton />
      </div>
      <MobileMenuDropdown />
    </motion.header>
  );
}
