# `/otc-funds` 路由 UI 重构方案

## Context

当前 `/otc-funds` 路由的桌面端 UI 出现"组件挤在一起、样式乱套"的问题：

1. **自选基金表单错位**：`md:grid-cols-[9rem_1fr_8rem_auto]` 在 769–1023px 中间断点下"名称"输入框与"分类"下拉被挤，按钮换行错位
2. **多 Card 垂直堆叠**：选择基金 / 自选基金 / 对比内容 3 个 Card 缺少视觉分组层次
3. **核心指标对比表列头拥挤**：颜色点 + 名称 + 删除按钮纵向堆成 3 行，列宽窄、长基金名换行
4. **移动端缺自选浏览入口**：`MobileCompareLayout` 设计良好但「自选基金 Card」在移动端完全未渲染，用户看不到自选列表

目标：让桌面端视觉清爽、分组清晰、消除中等宽度错位；让移动端补齐自选浏览入口；不破坏现有数据流与导出/对比功能。

## 设计决策（已与用户对齐）

- **「添加新自选」表单挪进 Sheet**（桌面/移动共用）：桌面端「自选 Card」退化为「只读紧凑列表 + 右上角 `+` 按钮弹 Sheet」。从根本上消除表单挤在一起的 bug，统一桌面与移动的添加交互
- **不改造 `compare.tsx`**：本次任务只动 `/otc-funds`
- **CategoryCchips 抽到独立文件**：避免新拆的 3 个组件重复内联实现
- **核心指标对比自适应**：1–2 只用卡片网格（友好），3–4 只用表格（省空间）
- **不重写 MobileCompareLayout 框架**：保留现有 Tab + 固定操作栏 + 底部 Sheet 体系；只新增 header 自选入口

## 实施步骤

### 1. 抽取 `CategoryChips` 到独立组件

**新增** `apps/website/app/components/otc/category-chips.tsx`

- 从 `otc-funds.tsx` 第 432–479 行提取
- 保持 `compact` prop 行为（移动端横滚、桌面端 flex-wrap）
- 替换 `otc-funds.tsx` 内的内联实现

### 2. 新增自选基金 Sheet（桌面+移动共用）

**新增** `apps/website/app/components/otc/custom-fund-sheet.tsx`

- 设计参考 `compare-mobile/fund-search-sheet.tsx` 的底部抽屉风格（80vh、拖拽抓手、ESC 关闭、自动聚焦）
- 内容：6 位代码输入 + 名称输入 + 分类下拉 + 保存按钮 / 保存并加入按钮
- 错误提示内联展示（用 `text-destructive` 替代 `text-amber-600`）
- 复用 `isValidFundCode` / `normalizeFundCode` / `addCustomFund`（来自 `~/stores/custom-otc-funds`）
- props：`open`, `onOpenChange`, `defaultCategory`, `defaultCategoryLabel`, `onSaved`, `reachedLimit`

### 3. 桌面端「选择基金」复合 Card

**新增** `apps/website/app/components/otc/fund-search-section.tsx`

- 三段式结构：分类 Chips / 搜索框+下拉 / 已选基金 chips
- 包装为单个 `Card`，分段用 `border-b` 分割（不是 3 个 Card）
- 分类区：上 padding，紧贴搜索
- 搜索区：搜索框 + 下拉建议（与现有逻辑一致）
- 已选区：标题「已选 (N/MAX)」+ `SelectedFundChips` + 提示「还可添加 N 只」
- 用 `MotionCard` + `StaggerContainer` 做首次加载入场；后续增删改用 `AnimatePresence` + `layout`（避免 stagger 反复触发）

### 4. 已选基金 chips（桌面）

**新增** `apps/website/app/components/otc/selected-fund-chips.tsx`

- props：`funds: Array<{code, name}>`, `onRemove: (code) => void`
- 渲染：颜色圆点（按 `COMPARE_COLORS[idx]` 取色） + 基金名 + 删除按钮
- 用 `AnimatePresence` + `motion.div layout` 让增删时位置平滑变化
- 不使用 stagger（避免重复入场）

### 5. 自选基金只读列表（桌面 Card）

**新增** `apps/website/app/components/otc/custom-fund-list-card.tsx`

- 替换原 `custom-fund-panel.tsx` 内容（保留文件名以最小化 import 变更）
- 顶部：标题「自选基金 (N)」+ 右上角 `Button` 触发 Sheet
- 列表：`Card` 内一行一个基金项：颜色色块 + 基金代码（mono） + 名称（truncate） + 分类 Badge + 「+ 加入对比」按钮 + 删除按钮
- 无自选时显示「还没有自选基金，点击右上角 + 添加」空态
- 列表项用 `AnimatePresence` + `layout`（增删平滑）
- 移动端不渲染（移动端用 Sheet 入口）

### 6. 自适应核心指标对比

**新增** `apps/website/app/components/otc/metrics-compare.tsx`

- props：`funds`, `onRemove`
- 当 `funds.length <= 2`：渲染 Card 网格（每只基金一个 `MotionCard`，内部：颜色点+名称（标题区）+ 移除按钮 + 5 个大数字指标块 + error 状态）
- 当 `funds.length >= 3`：渲染表格（保留现有 `MetricRow` 逻辑但修复列头：颜色点+名称+删除横向排列）
- 涨跌色统一红涨绿跌（与移动端 `MetricsCompareCard` 对齐）
- 处理 `fund.error` 分支（显示 N/A 视图）

### 7. 净值走势 / 阶段收益（桌面）

**改写** `otc-funds.tsx` 内 `NavTrendOverlay` / `PerformanceComparison`：

- 提升到 `app/components/otc/compare-sections.tsx`（桌面专用，移动端用 `compare-mobile/*` 体系）
- 调整 CardHeader 用 `flex items-center justify-between` 排版（标题左、说明右）
- 按钮组用 `Tabs` 风格（与 home.tsx `SectionTitle` 视觉一致）

### 8. 移动端 MobileCompareLayout 微改

**修改** `apps/website/app/components/compare-mobile/mobile-compare-layout.tsx`：

- 新增可选 prop `customFundsCount: number` 和 `onOpenCustomFunds: () => void`
- header 右侧（在 `${count}/${MAX}` 计数旁）加 `Button` 调 `onOpenCustomFunds`，文案「自选 (N)」
- 暴露 trigger 给父路由使用

**新增** `apps/website/app/components/compare-mobile/custom-funds-sheet.tsx`：

- 参考 `fund-search-sheet.tsx` 风格，80vh 底部抽屉
- 内容：所有自选基金列表（按 `customFunds` 数组），每项可加入对比 / 删除
- 已有 `onAddCustomFund` 的保存并加入逻辑保留

### 9. Skeleton 同步

**修改** `apps/website/app/components/ui/skeletons.tsx`：

- 新增 `OTCFundsDesktopSkeleton`：3 段（搜索+chips 区 + 自选列表区 + 对比内容区）
- 复用现有 `SelectedBadgesSkeleton` / `FundSearchSkeleton`
- 移动端 `MobileCompareLayoutSkeleton` 不动

### 10. 路由串联

**重写** `apps/website/app/routes/otc-funds.tsx`：

- 桌面端：3 段 Card 组合（搜索+已选 Card / 自选列表 Card / 对比内容区）
- 移动端：传 `customFunds.length` 给 `MobileCompareLayout` + `setOpenCustomFunds(true)` 触发器
- `loader` / `meta` / 自定义 hooks / URL 同步逻辑全部保留
- 分类切换、增删、置顶、URL 同步行为不变

### 11. 共享出口

**新增** `apps/website/app/components/otc/index.ts`：

- 导出 `CategoryChips` / `CustomFundSheet` / `CustomFundListCard` / `FundSearchSection` / `SelectedFundChips` / `MetricsCompare`
- 让 `otc-funds.tsx` 顶部有清晰 import 列表

## 关键文件清单

**修改**：

- `apps/website/app/routes/otc-funds.tsx`（重写）
- `apps/website/app/components/compare-mobile/mobile-compare-layout.tsx`（微改）
- `apps/website/app/components/ui/skeletons.tsx`（加 skeleton）

**新增**：

- `apps/website/app/components/otc/index.ts`
- `apps/website/app/components/otc/category-chips.tsx`
- `apps/website/app/components/otc/custom-fund-sheet.tsx`
- `apps/website/app/components/otc/custom-fund-list-card.tsx`
- `apps/website/app/components/otc/fund-search-section.tsx`
- `apps/website/app/components/otc/selected-fund-chips.tsx`
- `apps/website/app/components/otc/metrics-compare.tsx`
- `apps/website/app/components/otc/compare-sections.tsx`（桌面端 NavTrend / Performance）
- `apps/website/app/components/compare-mobile/custom-funds-sheet.tsx`

**删除/废弃**：

- `apps/website/app/components/otc/custom-fund-panel.tsx`（内容迁移到 `custom-fund-list-card.tsx`）—— **保留文件名并重写内容**，避免外部 import 报错（如确无引用，再删除）

**不动的文件**：

- `apps/website/app/components/compare-mobile/fund-search-sheet.tsx`、`fund-chip-strip.tsx`、`metrics-compare-card.tsx`、`trend-chart-mobile.tsx`、`performance-bars-mobile.tsx`、`constants.ts`
- `apps/website/app/components/charts/*`
- `apps/website/app/components/share-export/*`
- `apps/website/app/components/ui/{card,button,badge}.tsx`
- `apps/website/app/stores/custom-otc-funds.ts`
- `apps/website/app/lib/{seo,market-data,utils}.ts`
- `apps/website/app/routes/compare.tsx`（用户范围外）

## 复用现有工具

- `MotionCard` / `StaggerContainer` / `StaggerItem`（`~/components/motion`）：仅用于首次加载入场；动态增删改用 `AnimatePresence` + `layout`
- `Card` / `CardHeader` / `CardTitle` / `CardContent` / `CardDescription`（`~/components/ui/card`）：shadcn 风格、方角、ring
- `Badge` / `Button`（`~/components/ui/{badge,button}`）：现有变体 `default/secondary/outline/ghost/destructive`
- `compare-mobile/constants.ts` 的 `COMPARE_COLORS` / `MAX_COMPARE` / `getCompareColor`
- `useIsMobile`（`~/hooks/use-media-query`）
- `isValidFundCode` / `normalizeFundCode` / `useCustomOTCFundsStore`（`~/stores/custom-otc-funds`）

## 风险与对策

| 风险                                           | 对策                                                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 中间断点 (769-1023px) 错位                     | 新方案全部用响应式断点（`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` 等），不用固定 rem 宽度                           |
| Stagger 在动态列表反复触发                     | 已选 chips 与自选列表用 `AnimatePresence` + `layout`，不用 stagger                                                    |
| Sheet 缺少焦点陷阱/a11y                        | 复用 `fund-search-sheet.tsx` 的 `role="dialog"` + ESC + 自动聚焦；新增 `aria-controls` / `aria-expanded` 在触发按钮上 |
| 移除原 `custom-fund-panel.tsx` 破坏外部 import | 保留文件名重写内容；如确认无外部 import 再删除                                                                        |
| 桌面 `metrics-compare` 处理 `fund.error`       | 显式检测 `fund.error` 显示 N/A 视图（与移动 `MetricsCompareCard` 对齐）                                               |
| ShareExport 区域被新布局破坏                   | ShareExport 走独立 `FundCompareTemplate` 渲染，不依赖 DOM 截图；新布局保证「对比内容」Card 边界不变                   |

## 验证方案

### 1. 启动 + 桌面端 (`pnpm dev`，浏览器 1280px+)

- `/otc-funds`：分类 chips + 搜索 + 已选 chips 三段清晰
- 加 1 只基金：提示"再加 1 只开始对比"
- 加 2 只：核心指标对比走**卡片网格**视图（Card 每只基金一个）
- 加 3 只：核心指标对比**切到表格**视图
- 加 4 只：仍为表格；"添加基金"按钮禁用
- 自选基金：保存新基金 → 列表出现；点击 `+` → 弹 Sheet
- 自选 Sheet：输入错误代码 → 错误提示；保存成功 → 关闭 + 出现在列表
- 分类切换：URL 同步 + 搜索结果过滤
- 导出：≥ 2 只时显示导出按钮，PNG 下载正常
- 暗色模式：所有 Card 颜色对比足够

### 2. 移动端（DevTools 模拟 375px / 820px）

- `/otc-funds` → `MobileCompareLayout` 框架正常
- header 右上角「自选 (N)」按钮 → 弹 Sheet 列自选
- Sheet 内：可加入对比 / 删除
- 底部「+ 添加基金」按钮 → 搜索 Sheet 正常
- Tab 切换 指标/走势/收益 流畅
- 已选 fund-chip-strip 横滚正常

### 3. 中间断点（DevTools 模拟 820px 平板竖屏）

- 桌面端布局：搜索 + 已选 chips 完整展示
- 自选 Card：单列布局，列表项不挤
- 核心指标对比 1-2 只：卡片网格不爆列
- 核心指标对比 3-4 只：表格不爆列

### 4. 自动化检查

- `pnpm lint`（Oxlint）
- `pnpm typecheck`（tsc）
- 浏览器 console 无 hydration 错误

### 5. 现有功能回归

- 涨跌幅色：红涨绿跌（与中国股市惯例一致）
- 导出 PNG：内容正确
- URL 同步：`?funds=A,B&category=qdii` 分享链接正常还原
- 自选基金持久化：localStorage 数据保留
- 移动端「保存并加入 XXX」入口（fund-search-sheet.tsx 已有）：保留
