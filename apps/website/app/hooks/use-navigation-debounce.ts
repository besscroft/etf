/**
 * 路由导航防抖 hook
 *
 * 用于拦截触发路由跳转的交互元素（Link、Button 等）的点击事件，
 * 在防抖窗口内屏蔽重复点击，避免：
 * 1. 用户连续点击导致路由被多次触发
 * 2. View Transition 进行中再次触发跳转造成视觉异常
 *
 * 策略说明：
 * - 使用模块级时间戳，跨组件实例共享，整个应用统一防抖
 * - 默认阈值 600ms：覆盖 View Transition 默认动画时长（~250-400ms），
 *   同时避免对正常操作节奏产生明显迟滞
 * - 触发条件：任何成功通过防抖检查的点击都会重置计时器
 *
 * 与 View Transitions 的兼容性：
 * - 防抖在 click 事件层拦截，先于 React Router 的导航流程
 * - 浏览器 View Transition 动画期间，新的点击会被自动屏蔽
 * - 即使浏览器不支持 View Transitions，防抖仍能防止重复导航
 */
import { useCallback } from "react";

/** 防抖时间阈值（毫秒） */
const NAVIGATION_DEBOUNCE_MS = 600;

/** 模块级：最后一次触发导航的时间戳，跨组件共享 */
let lastNavigationTimestamp = 0;

/**
 * 检查当前是否处于导航防抖窗口内
 * @returns true 表示应当屏蔽本次点击
 */
export function isNavigationDebouncing(): boolean {
  return Date.now() - lastNavigationTimestamp < NAVIGATION_DEBOUNCE_MS;
}

/**
 * 标记一次导航已触发（重置防抖计时器）
 * 应在通过防抖检查后立即调用
 */
export function markNavigationTriggered(): void {
  lastNavigationTimestamp = Date.now();
}

/**
 * 路由导航防抖 hook
 *
 * 包装一个 click handler，自动应用防抖逻辑：
 * - 防抖窗口外：放行并重置计时器
 * - 防抖窗口内：阻止默认行为 + 停止事件传播
 *
 * @example
 * // 与 Link 配合
 * const handleClick = useNavigationDebounce<HTMLAnchorElement>(() => {
 *   console.log("导航触发");
 * });
 * <Link onClick={handleClick}>...</Link>
 *
 * // 与 Button 配合（用于 onClick 内调用 navigate 的场景）
 * const handleClick = useNavigationDebounce<HTMLButtonElement>(() => {
 *   navigate("/target", { viewTransition: true });
 * });
 * <button onClick={handleClick}>...</button>
 */
export function useNavigationDebounce<T extends Element = HTMLElement>(
  onClick?: React.MouseEventHandler<T>,
): React.MouseEventHandler<T> {
  return useCallback(
    (event: React.MouseEvent<T>) => {
      // 防抖窗口内：阻止本次点击触发任何副作用
      if (isNavigationDebouncing()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // 通过防抖：标记时间戳，调用业务 handler
      markNavigationTriggered();
      onClick?.(event);
    },
    [onClick],
  );
}
