/**
 * 动画配置 hook
 *
 * 封装 prefers-reduced-motion 无障碍偏好处理：
 * - 检测用户系统级"减少动画"设置
 * - 在 reduced motion 下返回降级配置（瞬时切换，无位移/缩放）
 * - 提供统一的动画开关，便于业务侧条件降级
 *
 * 根据 WCAG 2.1 SC 2.3.3 要求，尊重用户的无障碍偏好。
 */
import { useReducedMotion } from "motion/react";
import { useMemo } from "react";

import type { Variants } from "motion/react";
import {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  pageTransition,
} from "./variants";

/** 降级后的 variants：仅保留 opacity 过渡，移除位移/缩放 */
const reducedVariants = {
  fadeIn: { ...fadeIn, hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0 } } },
  fadeInUp: {
    ...fadeInUp,
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0 } },
  },
  fadeInDown: {
    ...fadeInDown,
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0 } },
  },
  fadeInLeft: {
    ...fadeInLeft,
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0 } },
  },
  fadeInRight: {
    ...fadeInRight,
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0 } },
  },
  scaleIn: {
    ...scaleIn,
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0 } },
  },
  pageTransition: {
    ...pageTransition,
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0 } },
    exit: { opacity: 0, transition: { duration: 0 } },
  },
} satisfies Record<string, Variants>;

/**
 * 动画配置 hook
 *
 * 返回当前是否应减少动画，以及降级后的 variants 集合。
 * 业务侧使用方式：
 *   const { variants, shouldReduceMotion } = useMotionConfig();
 *   <motion.div variants={shouldReduceMotion ? variants.fadeInUp : fadeInUp} />
 *
 * 或更简洁地直接使用返回的 variants（已自动降级）：
 *   const { variants } = useMotionConfig();
 *   <motion.div variants={variants.fadeInUp} />
 */
export function useMotionConfig() {
  const shouldReduceMotion = useReducedMotion();

  return useMemo(
    () => ({
      /** 是否应减少动画（用户开启了 prefers-reduced-motion） */
      shouldReduceMotion: Boolean(shouldReduceMotion),
      /** 已根据偏好降级的 variants 集合 */
      variants: shouldReduceMotion
        ? reducedVariants
        : {
            fadeIn,
            fadeInUp,
            fadeInDown,
            fadeInLeft,
            fadeInRight,
            scaleIn,
            pageTransition,
          },
    }),
    [shouldReduceMotion],
  );
}
