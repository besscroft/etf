/**
 * 当前路由 → 菜单项匹配 hook
 *
 * 匹配规则：
 * - 合并每项的 href 与 matchPaths 形成候选路径集
 * - 候选按路径长度降序排序（确保 /otc-fund 优先于 /otc-funds 命中）
 * - 对每个候选：完全相等、或 pathname 以 candidate + "/" 开头，视为命中
 * - 根路径 "/" 仅匹配完全相等的 pathname，避免误匹配所有路由
 */
import { useLocation } from "react-router";
import type { MenuItem } from "./types";

export interface CurrentRouteMatch {
  key: string | null;
  label: string | null;
}

function isMatch(pathname: string, candidate: string): boolean {
  if (candidate === "/") return pathname === "/";
  return pathname === candidate || pathname.startsWith(candidate + "/");
}

export function useCurrentRouteKey(config: MenuItem[]): CurrentRouteMatch {
  const { pathname } = useLocation();

  // 收集所有候选路径（含 href + matchPaths），按长度降序
  const candidates: Array<{ path: string; item: MenuItem }> = [];
  for (const item of config) {
    if (item.hidden) continue;
    for (const p of [item.href, ...(item.matchPaths ?? [])]) {
      candidates.push({ path: p, item });
    }
  }
  candidates.sort((a, b) => b.path.length - a.path.length);

  for (const { path, item } of candidates) {
    if (isMatch(pathname, path)) {
      return { key: item.key, label: item.label };
    }
  }
  return { key: null, label: null };
}
