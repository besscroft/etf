/**
 * 动画系统统一入口
 *
 * 集中导出预设常量、variants 和工具 hook，
 * 业务代码统一从此处导入，避免散乱引用。
 */
// 从 motion/react 透传常用类型，便于业务侧统一导入
export type { Variants, Transition, HTMLMotionProps } from "motion/react";

export * from "./presets";
export * from "./variants";
export * from "./use-motion-config";
