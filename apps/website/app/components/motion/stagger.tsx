/**
 * Stagger 列表依次入场组件
 *
 * 父容器 StaggerContainer 控制 stagger 节奏，
 * 子项 StaggerItem 继承父容器状态依次播放。
 *
 * 使用示例：
 *   <StaggerContainer>
 *     {items.map(item => (
 *       <StaggerItem key={item.id}>
 *         <Card>...</Card>
 *       </StaggerItem>
 *     ))}
 *   </StaggerContainer>
 *
 * 支持视口触发（inView）和立即触发两种模式。
 */
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ElementType, type ReactNode } from "react";

import { useMotionConfig } from "~/lib/motion";
import {
  createStaggerContainer,
  fadeInUp,
  fadeIn,
  scaleIn,
  STAGGER,
  VIEWPORT,
  type Variants,
} from "~/lib/motion";

interface StaggerContainerProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  /** 子节点（约束为 ReactNode，避免 MotionValue 类型冲突） */
  children?: ReactNode;
  /** stagger 间隔（秒），默认 STAGGER.normal */
  stagger?: number;
  /** 子项起始延迟（秒） */
  delayChildren?: number;
  /** 是否在滚动进入视口时触发 */
  inView?: boolean;
  /** 视口触发时是否只播放一次 */
  once?: boolean;
  /** 渲染的标签/组件 */
  as?: ElementType;
}

/** Stagger 容器：控制子项依次入场 */
export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  function StaggerContainer(
    {
      stagger = STAGGER.normal,
      delayChildren = 0,
      inView = false,
      once = VIEWPORT.once,
      as,
      children,
      variants: customVariants,
      ...props
    },
    ref,
  ) {
    const { shouldReduceMotion } = useMotionConfig();

    // reduced motion 下退化为瞬时显示，不 stagger
    const variants =
      customVariants ??
      (shouldReduceMotion
        ? {
            hidden: { opacity: 1 },
            show: { opacity: 1, transition: { staggerChildren: 0 } },
          }
        : createStaggerContainer(stagger, delayChildren));

    const MotionComp = as ? motion.create(as as ElementType) : motion.div;

    const animationProps = inView
      ? {
          initial: "hidden" as const,
          whileInView: "show" as const,
          viewport: { amount: VIEWPORT.amount, once, margin: VIEWPORT.margin },
        }
      : {
          initial: "hidden" as const,
          animate: "show" as const,
        };

    return (
      <MotionComp ref={ref} variants={variants} {...animationProps} {...props}>
        {children}
      </MotionComp>
    );
  },
);

interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  /** 子节点（约束为 ReactNode，避免 MotionValue 类型冲突） */
  children?: ReactNode;
  /** 子项入场样式，默认 "up"（淡入上移） */
  variant?: "up" | "none" | "scale";
  /** 渲染的标签/组件 */
  as?: ElementType;
}

/** Stagger 子项：继承父容器状态，配合 stagger 依次入场 */
export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(function StaggerItem(
  { variant = "up", as, children, variants: customVariants, ...props },
  ref,
) {
  const { shouldReduceMotion } = useMotionConfig();

  const variantMap: Record<string, Variants> = {
    up: fadeInUp,
    none: fadeIn,
    scale: scaleIn,
  };

  const variants =
    customVariants ??
    (shouldReduceMotion
      ? {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0 } },
        }
      : variantMap[variant]);

  const MotionComp = as ? motion.create(as as ElementType) : motion.div;

  return (
    <MotionComp ref={ref} variants={variants} {...props}>
      {children}
    </MotionComp>
  );
});
