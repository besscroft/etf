/**
 * AnimatedCounter 数字滚动组件
 *
 * 用于价格、指标、百分比等数字的沉浸式滚动动画。
 * 从 0 平滑过渡到目标值，支持小数、千分位、前缀/后缀。
 *
 * 实现要点：
 * - 使用 motion 的 useMotionValue + animate 驱动，避免 setState 重渲染
 * - 通过 useTransform 将 motion value 映射为格式化字符串
 * - 支持 whileInView 视口触发
 * - reduced motion 下直接显示终值
 *
 * 使用示例：
 *   <AnimatedCounter value={3250.42} decimals={2} prefix="$" />
 *   <AnimatedCounter value={68} suffix="%" inView />
 */
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  type MotionValue,
} from "motion/react";

import { useMotionConfig } from "~/lib/motion";
import { DURATION, EASING } from "~/lib/motion";

interface AnimatedCounterProps {
  /** 目标数值 */
  value: number;
  /** 小数位数，默认 0 */
  decimals?: number;
  /** 前缀（如 "$"、"¥"） */
  prefix?: string;
  /** 后缀（如 "%"、"x"） */
  suffix?: string;
  /** 是否启用千分位分隔符，默认 true */
  thousandSeparator?: boolean;
  /** 是否在滚动进入视口时触发，默认 true */
  inView?: boolean;
  /** 自定义 className */
  className?: string;
}

/** 将 motion value 格式化为带千分位的字符串 */
function formatNumber(
  value: number,
  decimals: number,
  thousandSeparator: boolean,
  prefix: string,
  suffix: string,
): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = thousandSeparator ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : intPart;
  const formatted = decPart ? `${formattedInt}.${decPart}` : formattedInt;
  return `${prefix}${formatted}${suffix}`;
}

export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  thousandSeparator = true,
  inView = true,
  className,
}: AnimatedCounterProps) {
  const { shouldReduceMotion } = useMotionConfig();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { amount: 0.5, once: true });

  // 初始显示值：reduced motion 或非 inView 模式下直接显示终值
  const initialValue = shouldReduceMotion || !inView ? value : 0;
  const motionValue = useMotionValue(initialValue);

  // 将 motion value 映射为格式化字符串
  const display = useTransform(motionValue as MotionValue<number>, (latest) =>
    formatNumber(latest, decimals, thousandSeparator, prefix, suffix),
  );

  // 静态降级：reduced motion 直接渲染终值，不订阅 motion value
  const [staticText] = useState(() =>
    formatNumber(value, decimals, thousandSeparator, prefix, suffix),
  );

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      return;
    }

    // inView 模式下等待进入视口才触发
    if (inView && !isInView) return;

    const controls = animate(motionValue, value, {
      duration: DURATION.slower,
      ease: EASING.easeOut,
    });

    return () => controls.stop();
  }, [value, motionValue, isInView, inView, shouldReduceMotion]);

  // reduced motion 直接输出静态文本，避免 motion 订阅开销
  if (shouldReduceMotion) {
    return (
      <span ref={ref} className={className}>
        {staticText}
      </span>
    );
  }

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
