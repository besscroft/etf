/**
 * 动画预设常量
 *
 * 统一管理时长、缓动、距离等基础参数，确保全站动画一致性。
 * 所有数值均经过性能与观感权衡：
 * - 优先动画 transform / opacity（GPU 加速）
 * - 时长控制在感知阈值内，避免拖沓
 * - 缓动曲线偏向"快出慢停"，符合自然运动直觉
 */

/** 动画时长（单位：秒） */
export const DURATION = {
  /** 极快：点击反馈、微交互 */
  instant: 0.12,
  /** 快：悬停、tap */
  fast: 0.18,
  /** 常规：入场、状态切换 */
  normal: 0.32,
  /** 慢：大区块入场、路由转场 */
  slow: 0.5,
  /** 极慢：视差、数字滚动、首屏 hero */
  slower: 0.8,
} as const;

/**
 * 缓动曲线（cubic-bezier 控制点）
 * 使用数组形式以兼容 motion 库的 transition.ease
 */
export const EASING = {
  /** 入场：快出慢停，元素"落定"感 */
  easeOut: [0.16, 1, 0.3, 1] as const,
  /** 退场：慢出快收，元素"抽离"感 */
  easeIn: [0.4, 0, 1, 1] as const,
  /** 状态切换：对称缓动 */
  easeInOut: [0.65, 0, 0.35, 1] as const,
  /** 强调入场：略带过冲，用于关键元素 */
  easeOutBack: [0.34, 1.56, 0.64, 1] as const,
} as const;

/** 位移距离（单位：px），用于 slide 入场动画 */
export const DISTANCE = {
  /** 微小位移：列表项、徽章 */
  xs: 8,
  /** 小位移：卡片、按钮 */
  sm: 16,
  /** 中位移：区块、面板 */
  md: 24,
  /** 大位移：路由转场、Hero */
  lg: 40,
} as const;

/** 缩放比例，用于 tap / hover 反馈 */
export const SCALE = {
  /** 点击下压 */
  tap: 0.97,
  /** 悬停轻微抬起 */
  hover: 1.02,
  /** 入场放大起点 */
  enter: 0.96,
} as const;

/**
 * 弹簧配置（用于交互式动画，如拖拽、弹簧回弹）
 * stiffness 越大越硬，damping 越大越少振荡
 */
export const SPRING = {
  /** 轻快：按钮、徽章 */
  snappy: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 } as const,
  /** 柔和：卡片、面板 */
  soft: { type: "spring", stiffness: 280, damping: 26, mass: 0.9 } as const,
  /** 稳重：路由转场、大区块 */
  firm: { type: "spring", stiffness: 200, damping: 28, mass: 1.1 } as const,
} as const;

/**
 * stagger 配置：列表项依次入场的间隔
 * 父容器通过 staggerChildren 触发子项依次播放
 */
export const STAGGER = {
  /** 紧凑：表格行、徽章组 */
  fast: 0.05,
  /** 常规：卡片网格 */
  normal: 0.08,
  /** 宽松：首屏 hero 指标 */
  slow: 0.12,
} as const;

/** 视口触发动画的配置（whileInView） */
export const VIEWPORT = {
  /** 触发阈值：元素进入 20% 即触发 */
  amount: 0.2,
  /** 只播放一次 */
  once: true,
  /** 上下边距触发范围 */
  margin: "0px 0px -10% 0px",
} as const;
