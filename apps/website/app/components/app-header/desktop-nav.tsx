/**
 * 桌面端水平导航
 *
 * 复用 StaggerContainer 实现首屏依次入场。
 * 当前路由匹配的菜单项追加高亮态样式。
 *
 * 未来扩展点：
 * - 多级菜单：在 items.map 之后递归渲染 children（见 types.ts）
 */
import { StaggerContainer, StaggerItem } from "~/components/motion";
import { AppLink as Link } from "~/components/ui/link";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useMenuContext } from "./menu-context";
import { useVisibleItems } from "./use-visible-items";

export function DesktopNav() {
  const { currentKey } = useMenuContext();
  const items = useVisibleItems();

  return (
    <StaggerContainer as="nav" className="hidden items-center gap-1 md:flex" stagger={0.04}>
      {items.map((item) => {
        const active = currentKey === item.key;
        return (
          <StaggerItem key={item.key}>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(active && "bg-muted text-foreground")}
            >
              <Link to={item.href}>{item.label}</Link>
            </Button>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}
