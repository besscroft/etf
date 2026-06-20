/**
 * FadeIn 通用淡入组件
 *
 * 最常用的入场动画组件，支持四个方向位移 + 延迟 + 视口触发。
 * 内置 prefers-reduced-motion 降级。
 *
 * 使用示例：
 *   <FadeIn>内容</FadeIn>
 *   <FadeIn direction="up" delay={0.2}>上移淡入</FadeIn>
 *   <FadeIn inView>滚动到视口时触发</FadeIn>
 */
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ElementType, type ReactNode } from "react";

import { useMotionConfig } from "~/lib/motion";
import { fadeIn, fadeInUp, fadeInDown, fadeInLeft, fadeInRight, VIEWPORT } from "~/lib/motion";

type Direction = "up" | "down" | "left" | "right" | "none";

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  /** 子节点（约束为 ReactNode，避免 MotionValue 类型冲突） */
  children?: ReactNode;
  /** 入场方向，默认 "up" */
  direction?: Direction;
  /** 入场延迟（秒），用于手动错开 */
  delay?: number;
  /** 是否在滚动进入视口时触发（默认 false，即立即触发） */
  inView?: boolean;
  /** 视口触发时是否只播放一次 */
  once?: boolean;
  /** 渲染的标签/组件，默认 "div" */
  as?: ElementType;
}

/** 方向 → variant 映射 */
const directionVariants = {
  none: fadeIn,
  up: fadeInUp,
  down: fadeInDown,
  left: fadeInLeft,
  right: fadeInRight,
} as const;

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(function FadeIn(
  {
    direction = "up",
    delay = 0,
    inView = false,
    once = VIEWPORT.once,
    as,
    children,
    variants: customVariants,
    transition: customTransition,
    ...props
  },
  ref,
) {
  const { shouldReduceMotion } = useMotionConfig();

  // 选择对应方向的 variant
  const baseVariants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0 } },
      }
    : directionVariants[direction];

  // 合并延迟到 transition
  const transition = customTransition
    ? { ...customTransition, delay }
    : delay > 0
      ? { delay }
      : undefined;

  // 如果有自定义 transition，需要合并到 variants 的 show 中
  const variants = customVariants ?? baseVariants;
  const finalVariants =
    transition && !customVariants
      ? {
          ...variants,
          show: {
            ...(variants as any).show,
            transition: { ...(variants as any).show?.transition, ...transition },
          },
        }
      : variants;

  const MotionComp = as ? motion(as as ElementType) : motion.div;

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
    <MotionComp ref={ref} variants={finalVariants} {...animationProps} {...props}>
      {children}
    </MotionComp>
  );
});
