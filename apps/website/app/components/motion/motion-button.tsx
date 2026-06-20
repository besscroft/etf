/**
 * MotionButton 动画按钮
 *
 * 在原 Button 样式基础上添加 motion 交互反馈：
 * - 悬停：轻微上抬（y: -1）
 * - 点击：轻微下压（scale: 0.97）
 *
 * 直接复用 buttonVariants 样式，保持与原 Button 视觉一致。
 *
 * 注意：
 * - 非 asChild 模式：使用 motion.button，完整支持 whileHover/whileTap
 * - asChild 模式：回退到原 Button + Slot（CSS transition 已提供基础反馈），
 *   因为 motion props 无法透传给任意子组件（如 Link）
 *
 * 使用示例：
 *   <MotionButton variant="ghost" size="sm">按钮</MotionButton>
 *   <MotionButton asChild variant="ghost"><Link to="/">首页</Link></MotionButton>
 */
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { Button } from "~/components/ui/button";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useMotionConfig } from "~/lib/motion";
import { buttonHover, buttonTap } from "~/lib/motion";

interface MotionButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children">, VariantProps<typeof buttonVariants> {
  /** 子节点（约束为 ReactNode，避免 MotionValue 类型冲突） */
  children?: ReactNode;
  /** 是否启用 asChild 模式（透传给子组件，如 Link） */
  asChild?: boolean;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(function MotionButton(
  { variant = "default", size = "default", asChild = false, className, children, ...props },
  ref,
) {
  const { shouldReduceMotion } = useMotionConfig();

  // reduced motion 下禁用位移反馈，仅保留原 CSS transition
  const interactionProps = shouldReduceMotion
    ? {}
    : {
        whileHover: buttonHover,
        whileTap: buttonTap,
      };

  // asChild 模式：回退到原 Button（Slot 透传），CSS transition 提供基础反馈
  if (asChild) {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        asChild
        className={className}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </Button>
    );
  }

  // 非 asChild 模式：motion.button + buttonVariants 样式
  return (
    <motion.button
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...interactionProps}
      {...props}
    >
      {children}
    </motion.button>
  );
});
