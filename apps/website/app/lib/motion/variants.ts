/**
 * 动画 variants 集合
 *
 * 基于 presets 的预设常量，定义可复用的 motion variants。
 * 所有 variants 均遵循"初始态 → 进入态 → 退场态"三段式，
 * 配合 StaggerContainer 实现列表依次入场。
 *
 * 使用方式：
 *   <motion.div variants={variants.fadeInUp} initial="hidden" animate="show">
 *   <StaggerContainer>{items.map(...)}</StaggerContainer>
 */
import type { Variants, Transition } from "motion/react";
import { DURATION, EASING, DISTANCE, SCALE, STAGGER } from "./presets";

/* ==================== 基础过渡 ==================== */

/** 常规入场过渡（easeOut） */
const easeOutTransition: Transition = {
  duration: DURATION.normal,
  ease: EASING.easeOut,
};

/** 慢速入场过渡（用于大区块） */
const slowEaseOutTransition: Transition = {
  duration: DURATION.slow,
  ease: EASING.easeOut,
};

/* ==================== 单元素 variants ==================== */

/** 纯淡入 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: easeOutTransition },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASING.easeIn } },
};

/** 淡入 + 上移（最常用） */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: DISTANCE.sm },
  show: { opacity: 1, y: 0, transition: easeOutTransition },
  exit: {
    opacity: 0,
    y: -DISTANCE.xs,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/** 淡入 + 下移（用于从顶部进入的元素，如下拉菜单） */
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -DISTANCE.sm },
  show: { opacity: 1, y: 0, transition: easeOutTransition },
  exit: {
    opacity: 0,
    y: -DISTANCE.xs,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/** 淡入 + 左移（用于从右侧进入的元素，如抽屉） */
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: DISTANCE.md },
  show: { opacity: 1, x: 0, transition: easeOutTransition },
  exit: {
    opacity: 0,
    x: DISTANCE.xs,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/** 淡入 + 右移（用于从左侧进入的元素） */
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: -DISTANCE.md },
  show: { opacity: 1, x: 0, transition: easeOutTransition },
  exit: {
    opacity: 0,
    x: -DISTANCE.xs,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/** 淡入 + 缩放（用于徽章、弹窗、关键元素） */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: SCALE.enter },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.easeOutBack },
  },
  exit: {
    opacity: 0,
    scale: SCALE.enter,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/* ==================== 容器 variants（stagger） ==================== */

/**
 * 创建 stagger 容器 variant
 * 父容器使用此 variant，子项使用 fadeInUp / fadeIn 等
 */
export function createStaggerContainer(
  stagger: number = STAGGER.normal,
  delayChildren: number = 0,
): Variants {
  return {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
    exit: {
      opacity: 1,
      transition: {
        staggerChildren: DURATION.instant,
        staggerDirection: -1,
      },
    },
  };
}

/** 快速 stagger 容器（表格行、徽章组） */
export const staggerContainerFast = createStaggerContainer(STAGGER.fast);

/** 常规 stagger 容器（卡片网格） */
export const staggerContainer = createStaggerContainer(STAGGER.normal);

/** 慢速 stagger 容器（首屏 hero） */
export const staggerContainerSlow = createStaggerContainer(STAGGER.slow);

/* ==================== 路由转场 variants ==================== */

/** 路由切换：淡入 + 轻微上移，配合 AnimatePresence mode="wait" */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: DISTANCE.xs },
  show: {
    opacity: 1,
    y: 0,
    transition: slowEaseOutTransition,
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.xs,
    transition: { duration: DURATION.normal, ease: EASING.easeIn },
  },
};

/* ==================== 交互反馈 variants ==================== */

/**
 * 卡片悬停：轻微上抬 + 阴影增强
 * 配合 whileHover 使用
 */
export const cardHover = {
  y: -2,
  transition: { duration: DURATION.fast, ease: EASING.easeOut },
};

/**
 * 按钮点击：轻微下压
 * 配合 whileTap 使用
 */
export const buttonTap = {
  scale: SCALE.tap,
  transition: { duration: DURATION.instant, ease: EASING.easeInOut },
};

/**
 * 按钮悬停：轻微上抬
 * 配合 whileHover 使用
 */
export const buttonHover = {
  y: -1,
  transition: { duration: DURATION.fast, ease: EASING.easeOut },
};

/* ==================== 进度条 / 温度条 variants ==================== */

/**
 * 进度条增长：宽度从 0 到目标值
 * 使用方式：<motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} />
 * 此 variant 用于配合 whileInView 触发
 */
export function createProgressVariant(targetPercent: number): Variants {
  return {
    hidden: { width: 0 },
    show: {
      width: `${Math.max(0, Math.min(100, targetPercent))}%`,
      transition: { duration: DURATION.slower, ease: EASING.easeOut },
    },
  };
}

/**
 * 温度计指针滑动：从左端滑到目标位置
 * 用于 MarketTemperature 的温度指针
 */
export function createIndicatorVariant(targetPercent: number): Variants {
  return {
    hidden: { left: "0%" },
    show: {
      left: `${Math.max(0, Math.min(100, targetPercent))}%`,
      transition: { duration: DURATION.slower, ease: EASING.easeOut },
    },
  };
}
