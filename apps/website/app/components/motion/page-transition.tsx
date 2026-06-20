/**
 * PageTransition 路由转场组件
 *
 * 配合 root.tsx 的 AnimatePresence 使用，
 * 为路由切换提供淡入 + 轻微位移的过渡效果。
 *
 * 使用方式（在 root.tsx 中）：
 *   <AnimatePresence mode="wait">
 *     <PageTransition key={location.pathname}>
 *       <Outlet />
 *     </PageTransition>
 *   </AnimatePresence>
 *
 * 注意：mode="wait" 确保旧页面退场完成后再入场新页面，
 * 避免滚动位置错乱。
 */
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";

import { useMotionConfig } from "~/lib/motion";
import { pageTransition } from "~/lib/motion";

interface PageTransitionProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  /** 子节点（约束为 ReactNode，避免 MotionValue 类型冲突） */
  children?: ReactNode;
  /** 路由标识，用于 AnimatePresence 识别进出场，通常传 location.pathname */
  routeKey?: string;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  function PageTransition({ routeKey, children, ...props }, ref) {
    const { shouldReduceMotion } = useMotionConfig();

    const variants = shouldReduceMotion
      ? {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0 } },
          exit: { opacity: 0, transition: { duration: 0 } },
        }
      : pageTransition;

    return (
      <motion.div
        ref={ref}
        key={routeKey}
        variants={variants}
        initial="hidden"
        animate="show"
        exit="exit"
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
