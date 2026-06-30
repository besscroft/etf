# AppHeader 路由布局组件抽象 — 收尾计划

## 背景

在前几轮对话中，已经完成了 AppHeader 组件的骨架实现并把所有路由迁移到新组件。本次会话再次收到"抽象为可复用路由布局组件"的请求，逐条对照需求清单确认：

### 已满足（无需再改）

| 需求             | 实现位置                                                           |
| ---------------- | ------------------------------------------------------------------ |
| 动态路由配置     | `MenuItem` + `mainMenu`（配置驱动）                                |
| 响应式布局适配   | `DesktopNav` (≥md) / `MobileMenuButton`+`MobileMenuDropdown` (<md) |
| 状态管理         | `MenuContext` + `MenuProvider`                                     |
| 统一样式         | `menu-gradient-bg` + sticky + backdrop-blur                        |
| 当前路由自动高亮 | `useCurrentRouteKey`（最长前缀优先）                               |
| 折叠/展开        | `mobileOpen` + 路由切换自动关闭                                    |
| Context 管理状态 | `MenuContext` + `useMenuContext`                                   |
| 一致行为和外观   | 全站共用 `MenuProvider` + 同一份 `mainMenu`                        |

### 用户已确认"仅文档/不做改动"项

- **多级菜单嵌套**：`MenuItem.children` 字段不加（"完全不做改动"）
- **权限控制集成**：不写 `usePermission`、不在 `MenuItem` 加 `permission` 字段（"仅文档说明，不写代码"）

## 本次范围（文档级收尾 + 小幅工具提取）

### 1. 文档化扩展点（不引入新代码/字段）

在以下文件的顶部注释中明确标注**未来扩展点**，方便后续维护时知道在哪里扩展：

- `types.ts`：列出「多级菜单」和「权限控制」两个扩展方向
  - 多级菜单：在 `MenuItem` 加 `children?: MenuItem[]`，`useCurrentRouteKey` 需递归展开候选路径，渲染组件需递归渲染
  - 权限控制：在 `MenuItem` 加 `permission?: string`，`MenuProvider` 接收 `user/permissions`，增加 `usePermission` hook
- `menu-config.ts`：补充"新增/调整菜单项"的指引（图标、matchPaths、hidden 字段使用）
- `menu-context.tsx`：补充"未来如何接入 permission"的占位说明
- `app-header.tsx`：补充"可选行为"（enableScrollHide / currentLabel / 未来增加 sticky 偏移 / 注入 brand）
- `index.ts`：扩充"对外契约"，列出推荐使用姿势

### 2. 顺手小优化（保持外部行为不变）

- **提取 `useVisibleItems`**：`desktop-nav.tsx:15` 和 `mobile-nav.tsx:17-20` 都有 `config.filter((item) => !item.hidden)` 的重复实现，抽到独立 hook 文件 `use-visible-items.ts`
- **集中导出**：在 `index.ts` 导出 `useVisibleItems`
- **desktop-nav / mobile-nav 改造**：分别 import `useVisibleItems`，删除本地实现

## 文件清单

### 修改

| 文件                                                      | 改动                                             |
| --------------------------------------------------------- | ------------------------------------------------ |
| `apps/website/app/components/app-header/types.ts`         | 顶部注释扩充「扩展点清单」；类型定义保持原样     |
| `apps/website/app/components/app-header/menu-config.ts`   | 顶部注释补充「新增菜单项指引」                   |
| `apps/website/app/components/app-header/menu-context.tsx` | 顶部注释补充「未来如何接入 permission」          |
| `apps/website/app/components/app-header/desktop-nav.tsx`  | 复用 `useVisibleItems`；注释补充                 |
| `apps/website/app/components/app-header/mobile-nav.tsx`   | 删除本地 `useVisibleItems`；复用公共版本         |
| `apps/website/app/components/app-header/app-header.tsx`   | 顶部注释补充「可选行为」说明                     |
| `apps/website/app/components/app-header/index.ts`         | 顶部注释扩充「对外契约」；导出 `useVisibleItems` |

### 新建

| 文件                                                          | 作用                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `apps/website/app/components/app-header/use-visible-items.ts` | 集中「过滤 hidden 菜单项」逻辑；desktop-nav / mobile-nav 复用 |

### 不改动的文件

- `apps/website/app/root.tsx`（`MenuProvider` 挂载已经正确）
- 11 个路由文件（已经全部迁移完成，无重复 Header）
- `use-current-route-key.ts`（匹配逻辑已对，无需调整）
- `app.css`（`menu-gradient-bg` 已生效）

## 验证步骤

1. `vp check` —— 确认格式化、类型、lint 全部通过
2. `vp run website#build` —— 确认客户端 + SSR 构建通过
3. 启动 dev server，手动验证：
   - 首页 / 11 个子页面 header 高亮正确
   - 移动端菜单展开/收起正常
   - 路由切换时移动端菜单自动关闭
4. 检查 `index.ts` 导出列表的完整性
5. 确认 `MenuItem` 类型签名未破坏 `mainMenu` 现有使用

## 风险与注意

- 仅文档与小幅重构，不引入新依赖、不改对外 API
- 不增加 `children` / `permission` 字段（按用户指示"完全不做改动" / "仅文档说明"）
- 不修改渲染逻辑，避免影响现有视觉
- 注释使用中文（按项目约定）
