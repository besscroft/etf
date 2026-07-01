/**
 * Google Analytics (gtag.js) 配置
 * - 测量 ID 可通过环境变量 VITE_GA_MEASUREMENT_ID 覆盖（CI/预发场景）
 * - SSR 阶段不发送任何数据；gtag.js 自身只在浏览器加载运行
 */

/** GA4 测量 ID（如 G-XXXXXXX） */
export const GA_MEASUREMENT_ID: string =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || "G-72YFK0NVVW";

/** 是否启用 GA 跟踪（默认 true，留空环境变量可关闭） */
export const isGAEnabled = (): boolean => {
  return GA_MEASUREMENT_ID.length > 0 && GA_MEASUREMENT_ID.startsWith("G-");
};
