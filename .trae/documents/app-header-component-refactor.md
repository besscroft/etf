# AppHeader 菜单组件抽象重构

## 概要

将分散在 11 个路由里的 Header 实现统一为单一可复用 `AppHeader` 组件，
通过 Context 管理状态、配置驱动的菜单数据、自动高亮当前路由。
子页面移除「← 返回」按钮，改用菜单里的「首页」入口达成相同效果。

## 现状

- `app-header` 目录**不存在**，需从零创建
- 11 个路由各自实现 `Header`，重复度高：
  - [home.tsx](file:///c:/github/etf/apps/website/app/routes/home.tsx#L75-L206)：完整导航 + 滚动隐藏 + 移动端菜单
  - [compare.tsx](file:///c:/github/etf/apps/website/app/routes/compare.tsx#L116-L140)、[analysis.tsx](file:///c:/github/etf/apps/website/app/routes/analysis.tsx#L77-L100)、[otc-funds.tsx](file:///c:/github/etf/apps/website/app/routes/otc-funds.tsx#L162-L185)、[otc-fund.tsx](file:///c:/github/etf/apps/website/app/routes/otc-fund.tsx#L107-L130)、[fund.\$code.tsx](file:///c:/github/etf/apps/website/app/routes/fund.$code.tsx#L40-L65)、[stable.tsx](file:///c:/github/etf/apps/website/app/routes/stable.tsx#L460-L482)、[qdii.tsx](file:///c:/github/etf/apps/website/app/routes/qdii.tsx#L52-L75)、[qdii-valuation.tsx](file:///c:/github/etf/apps/website/app/routes/qdii-valuation.tsx#L294-L310)、[nasdaq.tsx](file:///c:/github/etf/apps/website/app/routes/nasdaq.tsx#L104-L107)、[sp500.tsx](file:///c:/github/etf/apps/website/app/routes/sp500.tsx#L104-L107)、[active.tsx](file:///c:/github/etf/apps/website/app/routes/active.tsx#L119-L122)：返回按钮 + 品牌 + 面包屑
- [root.tsx](file:///c:/github/etf/apps/website/app/root.tsx) 当前只渲染 `<Outlet />`，未注入菜单上下文
- [app.css](file:///c:/github/etf/apps/website/app/app.css#L207-L209) `.menu-gradient-bg` 已就绪

## 目标组件 API

```tsx
// 顶层页面（home）
<AppHeader />

// 子页面
<AppHeader currentLabel="基金对比" />
```

- `currentLabel`：传入时在 brand 旁显示「ETFVoid / {currentLabel}」面包屑
- 不传时只显示 brand（首页形态）
- 滚动隐藏行为：**默认关闭**（避免子页面内容被频繁遮挡），通过 `enableScrollHide` prop 开启（首页用）

## 目录结构

```
apps/website/app/components/app-header/
├── types.ts                 # MenuItem / AppHeaderProps / MenuContextValue
├── menu-config.ts           # mainMenu: MenuItem[]  路由配置（图标、matchPaths）
├── use-current-route-key.ts # 路径→菜单项匹配（支持 matchPaths 多路径）
├── menu-context.tsx         # MenuProvider + useMenuContext
├── desktop-nav.tsx          # 桌面端水平导航
├── mobile-nav.tsx           # 移动端菜单按钮 + 下拉
├── app-header.tsx           # 组合主组件
└── index.ts                 # 统一导出
```

## 关键设计

### types.ts

- `MenuItem`：`{ key, label, href, icon?, matchPaths?, hidden? }`
  - 不含 `children`（多级菜单本轮不实现类型/UI）
  - 不含 `requiredRole`（用户决定权限跳过）
- `AppHeaderProps`：`{ currentLabel?: string; enableScrollHide?: boolean }`
- `MenuContextValue`：`{ config, currentKey, currentLabel, mobileOpen, toggleMobile, closeMobile, isTopLevel }`

### menu-config.ts

定义 `mainMenu`，按现有导航顺序：

```ts
[
  { key: "home", label: "首页", href: "/", icon: Home },
  { key: "nasdaq", label: "纳指被动", href: "/nasdaq", icon: TrendingUp },
  { key: "sp500", label: "标普500", href: "/sp500", icon: Activity },
  { key: "active", label: "美股主动", href: "/active", icon: BarChart3 },
  {
    key: "otc",
    label: "场外基金",
    href: "/otc-funds",
    icon: Wallet,
    matchPaths: ["/otc-funds", "/otc-fund", "/cn/funds", "/cn/fund"],
  },
];
```

- 同一菜单项可覆盖多条路径（场外基金的对比/详情都归到「场外基金」入口）
- 路径匹配用最长前缀命中，避免 `/otc-funds` 与 `/otc-fund` 串台

### use-current-route-key.ts

- 输入：`MenuItem[]`、当前 `pathname`
- 输出：匹配的 `key` 和 `label`
- 算法：遍历每个 item，合并 `[href, ...matchPaths]` 候选路径集，按长度降序比较，命中返回首个匹配

### menu-context.tsx

- `MenuProvider` 接 `config: MenuItem[]`
- 内部维护：`mobileOpen` 状态 + `useCurrentRouteKey` 计算
- 路由变化时（`useLocation`）自动 `closeMobile`
- 暴露 `useMenuContext` 供子组件读取

### app-header.tsx

- sticky 容器，`menu-gradient-bg` + `backdrop-blur-sm`
- 内部组合 `DesktopNav` + `MobileNav`
- 品牌区：图标 + 「ETFVoid」链接
- 当 `currentLabel` 存在时附加面包屑：`{brand} / {currentLabel}`
- 滚动隐藏：用 `useRef` + `useEffect` 监听 `scrollY`，仅 `enableScrollHide=true` 时挂载

### desktop-nav.tsx / mobile-nav.tsx

- 复用 `StaggerContainer`/`StaggerItem` 入场动画（仅首次挂载）
- 高亮项：从 `useMenuContext` 读 `currentKey`，对应 nav 按钮加 `bg-muted text-foreground`
- 移动端：Menu/X 图标 `AnimatePresence` 切换 + 折叠下拉（保留 home.tsx 原行为）
- 移动端菜单链接点击后 `closeMobile`（路由切换时也会自动关）

## 文件改动清单

### 新建

- [types.ts](file:///c:/github/etf/apps/website/app/components/app-header/types.ts)
- [menu-config.ts](file:///c:/github/etf/apps/website/app/components/app-header/menu-config.ts)
- [use-current-route-key.ts](file:///c:/github/etf/apps/website/app/components/app-header/use-current-route-key.ts)
- [menu-context.tsx](file:///c:/github/etf/apps/website/app/components/app-header/menu-context.tsx)
- [desktop-nav.tsx](file:///c:/github/etf/apps/website/app/components/app-header/desktop-nav.tsx)
- [mobile-nav.tsx](file:///c:/github/etf/apps/website/app/components/app-header/mobile-nav.tsx)
- [app-header.tsx](file:///c:/github/etf/apps/website/app/components/app-header/app-header.tsx)
- [index.ts](file:///c:/github/etf/apps/website/app/components/app-header/index.ts)

### 修改

- [root.tsx](file:///c:/github/etf/apps/website/app/root.tsx)：用 `<MenuProvider config={mainMenu}>` 包裹 `{children}`
- [home.tsx](file:///c:/github/etf/apps/website/app/routes/home.tsx)：
  - 删除本地 `Header` 组件（L75-L206）及 `mobileMenuOpen` state
  - 改用 `<AppHeader enableScrollHide />`
  - 清理 `Menu`/`X` 等图标 import（如已无其他用处）
- [compare.tsx](file:///c:/github/etf/apps/website/app/routes/compare.tsx)、[analysis.tsx](file:///c:/github/etf/apps/website/app/routes/analysis.tsx)、[otc-funds.tsx](file:///c:/github/etf/apps/website/app/routes/otc-funds.tsx)、[otc-fund.tsx](file:///c:/github/etf/apps/website/app/routes/otc-fund.tsx)、[fund.\$code.tsx](file:///c:/github/etf/apps/website/app/routes/fund.$code.tsx)、[stable.tsx](file:///c:/github/etf/apps/website/app/routes/stable.tsx)、[qdii.tsx](file:///c:/github/etf/apps/website/app/routes/qdii.tsx)、[qdii-valuation.tsx](file:///c:/github/etf/apps/website/app/routes/qdii-valuation.tsx)、[nasdaq.tsx](file:///c:/github/etf/apps/website/app/routes/nasdaq.tsx)、[sp500.tsx](file:///c:/github/etf/apps/website/app/routes/sp500.tsx)、[active.tsx](file:///c:/github/etf/apps/website/app/routes/active.tsx)：
  - 删除本地 `Header` 组件
  - 在 `<div className="min-h-screen bg-background">` 顶部插入 `<AppHeader currentLabel="..." />`
  - 清理 `ArrowLeft`/`BarChart3`/`Shield` 等仅 header 用的图标 import
  - 删除顶部导航 `motion.header` JSX 块

### 不动

- [app.css](file:///c:/github/etf/apps/website/app/app.css) `.menu-gradient-bg` 工具类（已就绪）
- [routes.ts](file:///c:/github/etf/apps/website/app/routes.ts) 路由配置
- 任何业务页面内容

## 关键文件参考

- 现 home.tsx header 实现：[home.tsx#L75-L206](file:///c:/github/etf/apps/website/app/routes/home.tsx#L75-L206)
- 现子页面 header 模板：[compare.tsx#L116-L140](file:///c:/github/etf/apps/website/app/routes/compare.tsx#L116-L140)
- AppLink（带 view transition）：[link.tsx](file:///c:/github/etf/apps/website/app/components/ui/link.tsx)
- 动画组件入口：[motion/index.ts](file:///c:/github/etf/apps/website/app/components/motion/index.ts)
- 按钮基础：[button.tsx](file:///c:/github/etf/apps/website/app/components/ui/button.tsx)

## 假设与决策

1. **当前页标签（currentLabel）由调用方显式传入**——不自动从路由 meta 推导（meta 当前是页面标题，含义不完全一致）
2. **滚动隐藏默认关闭**——子页面通常内容多且重要，避免频繁遮挡
3. **品牌图标复用 lucide `BarChart3`**——与 home 当前实现一致
4. **多级菜单**：不实现 UI、不在类型中预留 `children` 字段（用户答"完全跳过权限"暗含简化倾向；如后续需要再加）
5. **权限**：完全跳过，无 `Role` 类型、无 `requiredRole` 字段
6. **品牌点击行为**：统一跳 `/`（首页）
7. **首次入场动画保留**：与 home 当前行为一致，使用 `StaggerContainer` + `DURATION.normal`

## 验证步骤

1. `vp run website#check` 确认格式化与类型通过
2. `vp run website#build` 确认 SSR + 客户端构建无错
3. 启动 dev server，访问以下路由，确认：
   - `/` → 完整导航 + 滚动隐藏 + 移动端菜单折叠
   - `/cn/funds` → 完整导航 + 「ETFVoid / 基金对比」面包屑 + 「基金对比」菜单项高亮
   - `/otc-funds` → 「场外基金」高亮（matchPaths 生效）
   - `/fund/005827` → 完整导航 + 面包屑「ETFVoid」（fund.\$code 当前无 currentLabel）
   - 移动端访问任一路由 → 菜单按钮可折叠/展开，跳转后自动关闭
4. 用浏览器快照对比改造前后：首页滚动行为、子页导航外观、当前页高亮、移动端折叠交互
5. `vp run website#check` 二次确认无新增未使用导入/变量警告
