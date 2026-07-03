# /otc-funds 路由 UI 重设计 — 验收 & 微调

## 1. Summary

上一轮 `otc-funds-ui-redesign-v2.md` 计划已批准并实施完成。本文件为后续的**验收 / 微调**计划：基于 `vp dev` 浏览器实测，确认实现效果，识别是否还有需要微调的点。

核心目标：

- 确认桌面端 Hero + 3 段 SectionHeader + 2 列对比网格视觉节奏正确
- 确认移动端 sticky 顶栏 + 独立分类 chips 行 + 单层一体化底栏无重叠
- 修复可能存在的细节问题（间距、颜色、动效）

不引入新依赖，不改动数据流，仅做验收 + 必要的最小调整。

## 2. 验收现状（基于浏览器实测）

### 2.1 桌面端（实测视口 872 × 597，< lg 断点 1024px）

| 检查项                    | 状态      | 备注                                                                                    |
| ------------------------- | --------- | --------------------------------------------------------------------------------------- |
| Hero 区显示               | ✅        | H1「场外基金对比」+ 副标题「添加 2-4 只基金，多维度对比净值走势、阶段收益、费率和规模」 |
| 「选择基金」SectionHeader | ✅        | 左侧 Search 图标 + 标题 + 副标题，右侧 CategoryChips                                    |
| 「自选基金」SectionHeader | ✅        | 左侧 Database 图标 + 标题 + 计数，右侧「添加」按钮                                      |
| 「对比分析」SectionHeader | ✅        | 左侧 Activity 图标 + 标题 + 副标题「已选 N 只基金」                                     |
| 核心指标对比              | ✅        | 3+ 只时走表格视图，列对齐、涨跌色（红涨绿跌）正确                                       |
| 阶段收益对比              | ✅        | 柱状图 3 系列、4 周期（1月/3月/6月/1年/3年），色块对应基金                              |
| 整体视觉节奏              | ✅        | space-y-6 分段、Card 有内边距、SectionHeader 统一                                       |
| lg 断点 2 列网格          | ⚠️ 待验证 | 当前视口 872px 未达 lg，无法实测；代码 `lg:grid-cols-2` 正确                            |

### 2.2 移动端（代码层验收，未实测）

| 检查项                    | 状态 | 备注                                                               |
| ------------------------- | ---- | ------------------------------------------------------------------ |
| 顶部精简 Header h-12      | ✅   | 返回 + 标题 + 计数 + 自选入口                                      |
| 分类 chips 独立 sticky 行 | ✅   | `sticky top-12 z-30`                                               |
| Tab 切换 sticky 偏移      | ✅   | 有 category 时 `top-[5.0625rem]`，无时 `top-12`                    |
| 单层一体化底栏            | ✅   | chips + Button 合并到 1 个 `sticky bottom-0` 容器                  |
| safe-area-inset-bottom    | ✅   | Button padding 使用 `pb-[max(0.5rem,env(safe-area-inset-bottom))]` |
| 焦点还原                  | ✅   | `addButtonRef` 接到 CustomFundSheet.triggerRef                     |

## 3. 潜在微调点（待用户确认是否需要）

### 3.1 可选优化项

**A. 桌面端 lg 断点 2 列网格实测**

- 当前实测视口 872px 未达 lg（1024px），无法直接验证 2 列网格
- 建议：调整浏览器视口到 1280px 再截图确认（需要用户配合或后续手动验证）

**B. 自选基金列表项的卡片密度**

- 当前 `[custom-fund-list-card.tsx](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-list-card.tsx#L131-L184)` 的 `CustomFundItem` 用了 `grid sm:grid-cols-2`
- 桌面 2 列布局正常；如需更紧凑可改 `sm:grid-cols-3`（需 lg+ 视口）

**C. Hero 区域视觉强化**

- 当前 Hero 较克制（仅 H1 + 副标题）
- 可选：加渐变背景 / 装饰 SVG 提升品牌感（与 home.tsx 的 menu-gradient-bg 风格一致）
- 影响范围：仅 [otc-funds.tsx](file:///c:/github/etf/apps/website/app/routes/otc-funds.tsx#L176-L181)
- 工作量：小（5-10 行）

**D. SectionHeader 视觉一致性**

- 自选基金的 SectionHeader 是手写（[custom-fund-list-card.tsx#L58-L79](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-list-card.tsx#L58-L79)），没用 SectionHeader 组件
- 建议：改用 SectionHeader `compact` 模式统一（保持最小变更）
- 收益：未来若调 SectionHeader 样式，自选区会同步

### 3.2 不建议调整的点

- **不**调整 MetricsCompare 内部（1-2 卡 / 3+ 表）逻辑 — 现状合理
- **不**改 MobileCompareLayout 的 Tab 切换动效 — motion 过渡已 OK
- **不**改 FundSearchSection 内部结构 — 已把分类 chips 移到外层，结构清晰
- **不**新增 Loading 态 — 已有 OTCFundsDesktopSkeleton / MobileCompareLayoutSkeleton

## 4. 建议的最小调整

仅**强烈推荐**一项：

**→ 把 `CustomFundListCard` 的手写 header 改用 SectionHeader 组件**

理由：

- 避免未来 SectionHeader 改样式时此处不同步
- 代码一致性
- 改动量：~10 行

涉及文件：

- [custom-fund-list-card.tsx](file:///c:/github/etf/apps/website/app/components/otc/custom-fund-list-card.tsx#L57-L79)
- 替换为：
  ```tsx
  <SectionHeader
    icon={Database}
    title="自选基金"
    description={hasHydrated && customFunds.length > 0
      ? `本设备共 ${customFunds.length} 只，当前分类下 ${visibleCustomFunds.length} 只`
      : "保存常用基金到本浏览器，最多 50 只"}
    right={
      <Button ref={addButtonRef} ...>...</Button>
    }
  />
  ```

## 5. 验证步骤

1. **TS 类型检查**：`vp run website#typecheck` 必须无 error
2. **Lint / Format**：`vp check` 通过
3. **桌面端 1280×800 实测**（如能调到该视口）：
   - 选择 2 只基金：验证 2 列网格生效（指标 + 阶段收益并排，净值走势全宽）
   - 选择 4 只基金：MetricsCompare 走表格，对比区仍 2 列网格
4. **移动端 375×667**（如能调到该视口）：
   - 顶部 header + 分类 chips + Tab 三层 sticky 不重叠
   - 底栏合并为 1 层，chips 横向滚动
   - 选 2 只基金切换 Tab 内容切换正常
5. **功能回归**：添加 / 移除基金 URL 同步、自选 localStorage 持久化、导出按钮 ≥2 只时可见

## 6. Out of Scope

- 不改数据源 / SEO / analytics
- 不改其他路由 UI
- 不引入新依赖

## 7. 决策点（需用户确认）

请用户选择：

**Q1. 是否执行 §4 的「CustomFundListCard 改用 SectionHeader」调整？**

- A. 是（推荐，仅 10 行最小变更）
- B. 否（保持现状）

**Q2. 是否执行 §3.1.C 的 Hero 区域视觉强化？**

- A. 是（添加渐变背景 / 装饰）
- B. 否（保持克制）

**Q3. 是否需要在 1280px 视口实测 2 列网格？**

- A. 是（需要先调整浏览器视口设置）
- B. 否（代码已确认 `lg:grid-cols-2`，可信任）
