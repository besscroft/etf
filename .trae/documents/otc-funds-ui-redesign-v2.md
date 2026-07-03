# /otc-funds 路由 UI 重设计

## 1. Summary

在前几轮拆分（FundSearchSection / CustomFundListCard / MetricsCompare / MobileCompareLayout / CustomFundsSheet 等）的基础上，进一步打磨 `/otc-funds` 路由的视觉层次和移动端体验。核心目标：

- **桌面端**：用统一的「Section Header」样式 + 2 列网格（指标 + 阶段收益并排，净值走势全宽），让对比区一屏可览；修一个引用未声明变量的潜在 TS bug。
- **移动端**：把底栏合并为**单层一体化**结构（chips 横向滚动 + 主操作按钮），分类 chips 改为顶部一个独立 sticky 行；强化 header 信息密度。

不引入新依赖，不改动数据流（loader/URL/store 不变），仅做 UI 重组 + 样式打磨。

## 2. Current State Analysis

### 2.1 现有组件盘点（已实现，复用为主）

| 组件                                        | 路径                                                      | 作用                                       |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `FundSearchSection`                         | `app/components/otc/fund-search-section.tsx`              | 桌面端 3 段复合 Card（分类 + 搜索 + 已选） |
| `CustomFundListCard`                        | `app/components/otc/custom-fund-list-card.tsx`            | 桌面端自选基金只读列表                     |
| `SelectedFundChips`                         | `app/components/otc/selected-fund-chips.tsx`              | 桌面端已选基金 chips                       |
| `MetricsCompare`                            | `app/components/otc/metrics-compare.tsx`                  | 桌面端自适应核心指标（1-2 卡 / 3+ 表）     |
| `NavTrendOverlay` / `PerformanceComparison` | `app/components/otc/compare-sections.tsx`                 | 桌面端走势图 / 阶段收益 Card               |
| `MobileCompareLayout`                       | `app/components/compare-mobile/mobile-compare-layout.tsx` | 移动端外壳                                 |
| `FundChipStrip`                             | `app/components/compare-mobile/fund-chip-strip.tsx`       | 移动端底部已选 chips                       |
| `FundSearchSheet`                           | `app/components/compare-mobile/fund-search-sheet.tsx`     | 移动端搜索底部抽屉                         |
| `CustomFundsSheet`                          | `app/components/compare-mobile/custom-funds-sheet.tsx`    | 移动端自选基金 Sheet                       |
| `CategoryChips`                             | `app/components/otc/category-chips.tsx`                   | 桌面/移动共用分类 chips                    |
| `CustomFundSheet`                           | `app/components/otc/custom-fund-sheet.tsx`                | 桌面添加自选 Sheet                         |

### 2.2 现状问题

1. **Bug**：[custom-fund-list-card.tsx](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-list-card.tsx#L66) 的 `<Button ref={addButtonRef} ...>` 引用了未声明的 `addButtonRef`，会导致 TS 编译失败 / 运行时 ref undefined。
2. **桌面端视觉层次弱**：
   - `FundSearchSection` 把 3 段塞进 1 个 Card，但段与段之间只有 `border-t`，没有 Section Header 强调「选择基金」整体含义
   - 3 个主体 Card（搜索 / 自选 / 对比）只是 `space-y-4` 堆叠，没有视觉节奏
   - 对比区 3 张 Card 全部 `w-full` 撑满，1366+ 屏左右两侧大量留白，纵向滚动也长
3. **移动端底栏拥挤**：
   - `FundChipStrip` 在 `bottom-[3.25rem]` + 主操作按钮在 `bottom-0` = 双层 sticky，iPhone SE (375×667) 屏会占去近 1/4 屏高
   - 分类 chips 在 `headerExtras` 里夹在 sticky header 和 Tab 之间，视觉上跟「添加/导航」关系不清
4. **排版层级混乱**：混用 `text-xs / text-sm / text-base / text-2xl`，缺少统一 Section Header 范式

## 3. Proposed Changes

### 3.1 修 bug：custom-fund-list-card.tsx

- 删除 `addButtonRef` ref 引用（如不需要在打开 Sheet 时还原焦点）→ 改用 `useRef<HTMLButtonElement>(null)` + 把 ref 接到 Button，并通过 prop 传给 `CustomFundSheet.triggerRef` 实现焦点还原。
- 涉及文件：
  - [custom-fund-list-card.tsx](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-list-card.tsx)：声明 `addButtonRef = useRef<HTMLButtonElement>(null)`，接到 Button 的 `ref`
  - [custom-fund-sheet.tsx](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-sheet.tsx)：已在 `CustomFundSheetProps` 接收 `triggerRef`，无需新增

### 3.2 新增 `SectionHeader` 通用组件

新建 [section-header.tsx](file:///c:/github/etf/apps/website/app/components/otc/section-header.tsx)，统一桌面端 Section 视觉范式：

```
┌──────────────────────────────────────────────────┐
│ 🔍  选择基金     [股票/混合/指数/...]   [3/4]    │
│    添加最多 4 只基金开始多维度对比                │
└──────────────────────────────────────────────────┘
```

Props:

- `icon: LucideIcon` — 左侧图标（如 `Search`, `Database`, `BarChart3`）
- `title: string` — 主标题
- `description?: string` — 副标题（单行 muted-foreground）
- `right?: ReactNode` — 右侧额外内容（chips、徽章、按钮）
- `className?: string`

样式：

- 标题 `text-base md:text-lg font-semibold` + `text-primary` icon
- 副标题 `text-xs text-muted-foreground`
- 桌面端 `flex items-center justify-between`；移动端 `flex-col items-start gap-1`（具体用 CSS）

并在 [otc/index.ts](file:///c:/github/etf/apps/website/app/components/otc/index.ts) 导出。

### 3.3 桌面端布局重设计

在 [otc-funds.tsx](file:///c:/github/etf/apps/website/app/routes/otc-funds.tsx#L172-L246) 的桌面端主结构上做如下重组：

**改动 1：增加 Hero 区**

```tsx
<section className="mb-4 sm:mb-6">
  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">场外基金对比</h1>
  <p className="mt-1 text-sm text-muted-foreground">
    添加 2-4 只基金，多维度对比净值走势、阶段收益、费率和规模
  </p>
</section>
```

**改动 2：用 SectionHeader 包裹 FundSearchSection**

- 把 `FundSearchSection` 外层加一个 `<section className="space-y-2">`：
  - `<SectionHeader icon={Search} title="选择基金" description="..." right={CategoryChips} />`
  - `<Card>...</Card>` ← 原 FundSearchSection 内部结构
- 这样分类 chips 从 Card **内**上移到 Card **外**的 SectionHeader 右侧，既不挤进 Card 又保持视觉关联。

**改动 3：用 SectionHeader 包裹 CustomFundListCard**

- 类似处理，把「添加」按钮和计数放到 SectionHeader 的 `right`，Card 内部只保留列表

**改动 4：对比区 2 列网格（用户已确认）**

```tsx
<div className="grid gap-4 lg:grid-cols-2">
  <MetricsCompare funds={...} onRemove={...} />     {/* 左：核心指标 */}
  <PerformanceComparison funds={...} detailHref={...} /> {/* 右：阶段收益 */}
</div>
<NavTrendOverlay funds={...} detailHref={...} />     {/* 满宽：净值走势 */}
```

- lg 以下（< 1024px）回退单列堆叠，移动端自然继承
- `MetricsCompare` 的 `TABLE_THRESHOLD = 3` 保持不变，3+ 只时仍走表格

**改动 5：空状态视觉**

- 现有 EmptyState 居中图标 + 文案即可
- 增加 hover 状态（推荐下一步添加基金）→ 暂不加，保持最小变更

### 3.4 移动端布局重设计

主要改 [mobile-compare-layout.tsx](file:///c:/github/etf/apps/website/app/components/compare-mobile/mobile-compare-layout.tsx)：

**改动 1：分类 chips 独立 sticky 行**

- 删除 `headerExtras` 在 main 内部的渲染（移除 `headerExtras` 的引用），改为：
  - 在 `header` 下方加一个独立的 sticky 行：
  ```tsx
  <div className="sticky top-12 z-30 border-b bg-background/95 px-2 py-1.5 backdrop-blur-sm">
    <CategoryChips active={activeCategory} onChange={setCategory} compact />
  </div>
  ```
- 这样分类与导航/标题彻底分层，视觉关系清晰

**改动 2：单层一体化底栏（用户已确认）**

- 把现有的 `FundChipStrip` + 主操作按钮合并为 1 个 sticky 容器：

```tsx
{hasFunds && (
  <div className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur-sm">
    <FundChipStrip funds={funds} onRemove={onRemove} />
    <div className="px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <Button ... onClick={() => setSearchOpen(true)} className="h-10 w-full">
        <Plus /> {reachedLimit ? `已达上限 ${MAX_COMPARE} 只` : "添加基金"}
      </Button>
    </div>
  </div>
)}
```

- 优点：占 1 栏高度，视觉统一；滚动时 chips + 按钮一起 sticky，不会错位
- FundChipStrip 内部 `overflow-x-auto` 保持，移动端横向滑动

**改动 3：Header 信息密度**

- 当前 header h-12 (48px) 偏单薄
- 改为 h-12 保持（拇指热区原因），但把 BarChart3 改为右侧 meta（如「N/4」徽章 + 自选入口）合并到更紧凑的 `gap-1.5`
- 移除 `BarChart3` 图标（和标题组合视觉冗余），标题独占左侧

**改动 4：移除 `CategoryChipsMobile` 内嵌组件**

- [otc-funds.tsx](file:///c:/github/etf/apps/website/app/routes/otc-funds.tsx#L252-L261) 的 `CategoryChipsMobile` 包装层去除，直接传 `activeCategory` / `setCategory` 到 MobileCompareLayout 的新 prop `category` / `onCategoryChange`
- 这样 mobile-compare-layout 自己持有 category state 的渲染（activeCategory 来自 URL 同步，由父组件传入）

### 3.5 排版层级规范

桌面端 Section 顺序与字号：

| 层级   | 用途         | 字号                                            | 颜色                    |
| ------ | ------------ | ----------------------------------------------- | ----------------------- |
| H1     | 页面主标题   | `text-2xl md:text-3xl font-bold tracking-tight` | `text-foreground`       |
| H2     | Section 标题 | `text-base md:text-lg font-semibold`            | `text-foreground`       |
| H3     | Card 标题    | `text-sm md:text-base font-medium`              | `text-foreground`       |
| 副标题 | Section 描述 | `text-xs`                                       | `text-muted-foreground` |
| 正文   | 数值/标签    | `text-sm tabular-nums`                          | `text-foreground`       |
| 辅助   | hint/计数    | `text-xs`                                       | `text-muted-foreground` |

## 4. Files to Change

| 文件                                                                                                                    | 变更                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [custom-fund-list-card.tsx](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-list-card.tsx)            | 修复 `addButtonRef` bug；用 SectionHeader 替换 CardHeader                                               |
| [fund-search-section.tsx](file:///c:/github/etf/apps/website/app/components/otc/fund-search-section.tsx)                | 把分类 chips 移出 Card 内，Card 只保留搜索 + 已选                                                       |
| [otc-funds.tsx](file:///c:/github/etf/apps/website/app/routes/otc-funds.tsx)                                            | 增加 Hero 区；用 SectionHeader 包裹；对比区改 2 列网格；删除 `CategoryChipsMobile` 内嵌                 |
| [mobile-compare-layout.tsx](file:///c:/github/etf/apps/website/app/components/compare-mobile/mobile-compare-layout.tsx) | 分类 chips 独立 sticky 行；底栏合并为单层；移除 headerExtras；增加 `category` / `onCategoryChange` prop |
| [section-header.tsx](file:///c:/github/etf/apps/website/app/components/otc/section-header.tsx)                          | 新建：统一桌面端 Section 标题/描述/右侧 actions 范式                                                    |
| [otc/index.ts](file:///c:/github/etf/apps/website/app/components/otc/index.ts)                                          | 导出 SectionHeader                                                                                      |
| [custom-fund-sheet.tsx](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-sheet.tsx)                    | 接入 `triggerRef` 用于焦点还原（已支持，无需大改）                                                      |

## 5. Assumptions & Decisions

1. **不引入新依赖**：所有改动用现有的 `motion` / `lucide-react` / Tailwind 类完成
2. **不改变数据流**：loader / URL / zustand store 都不变
3. **响应式断点**：
   - 移动端 / 桌面端 = `<= 768px` / `> 768px`（与 `useIsMobile` 一致）
   - 对比区 2 列 = `>= 1024px` (lg)，< lg 自动回退单列
4. **SectionHeader 默认渲染桌面端样式**（`flex`），移动端由调用方传 `compact` prop 切换为 `flex-col`
5. **CategoryChips 复用**：桌面端 SectionHeader 的 `right` slot 传入 + 移动端独立 sticky 行都用现有 `CategoryChips compact={...}`，不新增组件
6. **不新增/删除测试**：项目无单测覆盖此路由
7. **SEO / meta 不变**：`buildMeta` 维持现状
8. **最小变更原则**：
   - 不重写 FundSearchSection 内部逻辑，只调外层结构
   - 不重写 MetricsCompare 内部，只在路由层包 2 列网格
   - 不改 custom-otc-funds store / Sheet 内部逻辑

## 6. Verification Steps

1. **TS 类型检查**：
   - `vp run website#typecheck` 必须无 error
2. **Lint / Format**：
   - `vp check` 通过
3. **浏览器实测**（用 MCP browser）：
   - **桌面端 1280×800**：
     - `/otc-funds` 空状态视觉居中、无溢出
     - 选 2 只基金：2 列网格生效（指标 + 收益并排，趋势全宽）
     - 选 4 只基金：MetricsCompare 走表格视图，对比区仍是 2 列网格
     - 自选区：列表项 hover / 删除动效正常
   - **移动端 375×667** (iPhone SE)：
     - 顶部 header + 分类 chips + Tab 三层 sticky 不重叠
     - 底栏合并为 1 层，chips 横向滚动
     - 点「添加基金」打开底部 Sheet
     - 选 2 只基金切换 Tab：指标 / 走势 / 收益 内容切换正常
4. **功能回归**：
   - 添加 / 移除基金 URL 同步
   - 自选基金 localStorage 持久化
   - 导出 / 分享按钮（`ShareExport`）仍可见（≥2 只时）
5. **可访问性**：
   - 所有交互元素键盘可达
   - 分类 chips 保留 `role="tab"` + `aria-selected`
   - Sheet 焦点还原（`triggerRef` 接通后）

## 7. Out of Scope

- 不改数据源（market-data.ts）
- 不改 SEO meta / JSON-LD
- 不改 analytics / ads
- 不改其他路由（`/fund/:code` / `/otc-fund` / `/`）的 UI
- 不改 AppHeader（顶部导航）
- 不改 `useCustomOTCFundsStore` 行为
- 不引入新设计 token / 主题变量
