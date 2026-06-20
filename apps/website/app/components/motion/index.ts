/**
 * 动画组件库统一入口
 *
 * 导出所有可复用的动画组件，业务代码统一从此处导入。
 *
 * 组件清单：
 * - FadeIn：通用淡入（支持方向、延迟、视口触发）
 * - StaggerContainer / StaggerItem：列表依次入场
 * - PageTransition：路由转场
 * - AnimatedCounter：数字滚动
 * - MotionCard：动画卡片（hover lift + 入场）
 * - MotionButton：动画按钮（hover + tap 反馈）
 */
export { FadeIn } from "./fade-in";
export { StaggerContainer, StaggerItem } from "./stagger";
export { PageTransition } from "./page-transition";
export { AnimatedCounter } from "./animated-counter";
export { MotionCard } from "./motion-card";
export { MotionButton } from "./motion-button";
