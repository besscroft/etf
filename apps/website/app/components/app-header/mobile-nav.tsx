/**
 * 移动端导航
 *
 * 拆分为两个组件（按钮 + 抽屉），分别放置在 header 内不同 DOM 位置：
 * - MobileMenuButton：放在 header 内容行右侧
 * - MobileMenuDropdown：作为 header 内容行的兄弟节点，保证背景横跨整个 header 宽度
 *
 * 未来扩展点：
 * - 多级菜单：在 items.map 之后递归渲染 children（手风琴折叠样式）
 */
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { AppLink as Link } from "~/components/ui/link";
import { Button } from "~/components/ui/button";
import { StaggerContainer, StaggerItem } from "~/components/motion";
import { DURATION, EASING } from "~/lib/motion";
import { cn } from "~/lib/utils";
import { useMenuContext } from "./menu-context";
import { useVisibleItems } from "./use-visible-items";

export function MobileMenuButton() {
  const { mobileOpen, toggleMobile } = useMenuContext();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={toggleMobile}
      aria-label="菜单"
      aria-expanded={mobileOpen}
    >
      <AnimatePresence mode="wait" initial={false}>
        {mobileOpen ? (
          <motion.span
            key="close"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASING.easeInOut }}
          >
            <X className="size-5" />
          </motion.span>
        ) : (
          <motion.span
            key="open"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASING.easeInOut }}
          >
            <Menu className="size-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

export function MobileMenuDropdown() {
  const { mobileOpen, currentKey } = useMenuContext();
  const items = useVisibleItems();

  return (
    <AnimatePresence>
      {mobileOpen && (
        <motion.nav
          className="border-t menu-gradient-bg backdrop-blur-sm px-3 py-2 md:hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: DURATION.normal, ease: EASING.easeInOut }}
          style={{ overflow: "hidden" }}
        >
          <StaggerContainer className="flex flex-col gap-0.5" stagger={0.05}>
            {items.map((item) => {
              const Icon = item.icon;
              const active = currentKey === item.key;
              return (
                <StaggerItem key={item.key}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start gap-2",
                      active && "bg-muted text-foreground",
                    )}
                    asChild
                  >
                    <Link to={item.href}>
                      {Icon ? <Icon className="size-4" /> : null}
                      {item.label}
                    </Link>
                  </Button>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
