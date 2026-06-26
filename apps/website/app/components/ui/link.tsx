/**
 * AppLink 应用级路由链接组件
 *
 * 在 React Router 的 Link 基础上默认开启两项关键能力：
 * 1. **viewTransition**：自动包裹 `document.startViewTransition()`，
 *    配合 app.css 中的 `::view-transition-old/new(root)` 动画
 *    实现原生、流畅、GPU 加速的路由转场效果。
 * 2. **导航防抖**：通过 useNavigationDebounce 在 click 层拦截重复点击，
 *    防止路由多次触发或转场动画期间被中断。
 *
 * 业务侧推荐统一使用 AppLink 替代 react-router 的原生 Link：
 *   import { AppLink as Link } from "~/components/ui/link";
 *
 * 兼容性：
 * - 不支持 View Transitions API 的浏览器会优雅降级为无动画跳转
 * - 防抖逻辑独立于动画，无浏览器兼容性问题
 */
import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router";

import { useNavigationDebounce } from "~/hooks/use-navigation-debounce";

export type AppLinkProps = LinkProps;

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
  // viewTransition 默认开启；业务侧可显式传 false 关闭（极少需要）
  { viewTransition = true, onClick, ...props },
  ref,
) {
  // 包装 onClick：注入防抖逻辑（防抖窗口内的点击被屏蔽）
  const debouncedClick = useNavigationDebounce<HTMLAnchorElement>(onClick);

  return <Link ref={ref} viewTransition={viewTransition} onClick={debouncedClick} {...props} />;
});
