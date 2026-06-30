/**
 * 过滤 hidden 菜单项的 hook
 *
 * 集中维护「导航中可见」的判定逻辑，避免 desktop-nav / mobile-nav
 * 等多处重复实现同一过滤。
 *
 * 未来扩展点：
 * - 多级菜单：可改为递归过滤（hidden 子树整体不显示）
 * - 权限控制：在此处叠加 usePermission 判定，未授权项一并过滤
 */
import { useMenuContext } from "./menu-context";
import type { MenuItem } from "./types";

export function useVisibleItems(): MenuItem[] {
  const { config } = useMenuContext();
  return config.filter((item) => !item.hidden);
}
