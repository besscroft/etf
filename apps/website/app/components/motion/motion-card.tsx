/**
 * MotionCard 动画卡片
 *
 * 在原 Card 基础上添加：
 * - 入场动画（淡入 + 上移，支持 stagger）
 * - 悬停动画（轻微上抬 + 阴影增强）
 * - 视口触发（滚动进入时播放）
 *
 * 保留原 Card 的所有 API，仅扩展动画相关 props。
 * 表格内或不需要动画的场景请继续使用原 Card。
 *
 * 使用示例：
 *   <MotionCard hover inView>...</MotionCard>
 *   <StaggerContainer>
 *     <StaggerItem><MotionCard hover>...</MotionCard></StaggerItem>
 *   </StaggerContainer>
 */
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";

import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { useMotionConfig } from "~/lib/motion";
import { fadeInUp, cardHover, VIEWPORT } from "~/lib/motion";

interface MotionCardProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  /** 子节点（约束为 ReactNode，避免 MotionValue 类型冲突） */
  children?: ReactNode;
  /** 是否启用悬停上抬效果，默认 true */
  hover?: boolean;
  /** 是否在滚动进入视口时触入场动画，默认 false（配合 StaggerContainer 使用时关闭） */
  inView?: boolean;
  /** 卡片尺寸，透传给 Card */
  size?: "default" | "sm";
  /** 是否作为 stagger 子项（不自动播放 initial/animate，由父容器控制） */
  asStaggerItem?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(function MotionCard(
  {
    hover = true,
    inView = false,
    asStaggerItem = false,
    size,
    className,
    children,
    variants: customVariants,
    ...props
  },
  ref,
) {
  const { shouldReduceMotion } = useMotionConfig();

  const variants =
    customVariants ??
    (shouldReduceMotion
      ? {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0 } },
        }
      : fadeInUp);

  // stagger 子项模式：不设置 initial/animate，由父容器控制
  const animationProps = asStaggerItem
    ? {}
    : inView
      ? {
          initial: "hidden" as const,
          whileInView: "show" as const,
          viewport: { amount: VIEWPORT.amount, once: VIEWPORT.once, margin: VIEWPORT.margin },
        }
      : {
          initial: "hidden" as const,
          animate: "show" as const,
        };

  // reduced motion 下禁用 hover 位移
  const hoverProps = hover && !shouldReduceMotion ? { whileHover: cardHover } : {};

  return (
    <motion.div ref={ref} variants={variants} {...animationProps} {...hoverProps} {...props}>
      <Card size={size} className={cn("h-full", className)}>
        {children}
      </Card>
    </motion.div>
  );
});
