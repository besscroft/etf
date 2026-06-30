# 场外基金 — 首页入口收尾

## Context

场外基金对比/详情功能的数据层、路由、两个新页面、移动端 layout 改造均已完成（见 `otc-fund-feature.md`）。本方案只处理**最后一步**：在 `app/routes/home.tsx` 暴露入口，让用户能从首页头部和工具箱直接进到场外基金。

约束（已与用户确认）：

- **不替换**现有的"基金对比/基金分析"卡（QDII 专题入口），而是**新增第 4 张**「场外基金」卡，副标题写明覆盖范围。
- **不替换**桌面端导航数组结构，只在 `navItems` 末尾追加一条；移动端下拉菜单直接复用同一数组，自动同步。
- 桌面端和移动端都暴露入口（移动端通过现有抽屉式菜单渲染同一 `navItems`）。

## 改动清单

### 1. `apps/website/app/routes/home.tsx`

#### 1.1 lucide-react 引入 `Wallet` 图标

当前第 16–29 行的 `import { ... } from "lucide-react"` 末尾追加 `Wallet`：

```ts
import {
  BarChart3,
  Search,
  ArrowRight,
  Activity,
  Gauge,
  LineChart,
  Menu,
  X,
  TrendingUp,
  Plus,
  Check,
  Layers,
  Wallet, // 新增 — 场外基金卡片图标（代表投资组合/资金）
} from "lucide-react";
```

> 备选：`Briefcase`（公文包）、`CircleDollarSign`（美元圈）。`Wallet` 视觉简洁、与现有 icon 风格一致。

#### 1.2 `navItems` 追加场外基金入口（第 81–86 行）

```ts
const navItems = [
  { label: "首页", href: "/" },
  { label: "纳指被动", href: "/nasdaq" },
  { label: "标普500", href: "/sp500" },
  { label: "美股主动", href: "/active" },
  { label: "场外基金", href: "/otc-funds" }, // 新增
];
```

桌面端 `<StaggerContainer as="nav">` 和移动端抽屉菜单都遍历这同一个数组，**只改一处即可两端生效**。

#### 1.3 `ToolboxSection` 新增第 4 张卡（第 606–642 行）

在第 3 张「QDII 估值」卡之后、`</StaggerContainer>` 之前插入：

```tsx
<StaggerItem className="[&>div]:h-full">
  <ToolCard
    icon={<Wallet className="size-5" />}
    title="场外基金"
    description="覆盖股票型 / 混合型 / 指数型 / 债券型 / QDII / FOF 六大类场外基金，支持多只对比与单只详情"
    href="/otc-funds"
    quickLinks={[
      { label: "对比", href: "/otc-funds" },
      { label: "详情", href: "/otc-fund" },
    ]}
  />
</StaggerItem>
```

**布局影响**：`ToolboxSection` 当前是 `grid gap-3 sm:grid-cols-2 md:grid-cols-3`。4 张卡在断点上的分布：

- 移动端 (1 col)：4 行
- sm (2 col)：2 × 2
- md+ (3 col)：第 4 张独占第二行

视觉上仍均衡，**无需调整 grid 列数**。如后续扩展到 ≥5 张，再考虑改为 `md:grid-cols-2 lg:grid-cols-4`。

**字段说明**：

- `href="/otc-funds"`：主操作按钮"进入"指向对比页（用户首屏常用动作）。
- `quickLinks`：右上角两枚小 chip，"对比"和"详情"分别直达 `/otc-funds` / `/otc-fund`，符合"对比和详情"两入口诉求。
- 描述文：明确写出"股票型 / 混合型 / 指数型 / 债券型 / QDII / FOF 六大类场外基金"，与 `OTC_CATEGORY_ORDER` 一一对应。

## 关键文件

| 路径                                             | 动作                                                     |
| ------------------------------------------------ | -------------------------------------------------------- |
| `c:\github\etf\apps\website\app\routes\home.tsx` | `navItems` +1 项；`ToolCard` +1 张；lucide 增加 `Wallet` |

> 不动 `routes.ts` / `otc-funds.tsx` / `otc-fund.tsx` / `mobile-compare-layout.tsx` / `market-data.ts`。

## 复用现有工具

- `ToolCard` 组件：已支持 `icon` / `title` / `description` / `href` / `quickLinks`（见 `home.tsx` 第 644–704 行），无需修改。
- `AppLink as Link` / `MotionButton`：导航按钮沿用 stagger 入场动画。

## 假设与决策

1. **不替换现有 3 张卡**：保留 QDII 专题入口（用户明确："保留 QDII + 新增场外"）。
2. **入口主操作指向对比页**：对比是用户最高频动作；详情通过 `quickLinks` 暴露。
3. **副标题写明六大类**：用户原话"副标题注明场外范围"。
4. **图标选 `Wallet`**：与"基金/投资"语义直接相关，且现有 icon 列表里无重复。
5. **不动 grid 列数**：4 张卡在 `md:grid-cols-3` 下仍自然分布（3+1 两行），避免无谓的样式变更。

## 验证

1. `vp check` — 格式化、lint、类型检查（必须 0 错）
2. `vp test` — 跑测试（如有）
3. `vp run website#dev` 启动 dev，浏览器手测：
   - [ ] 访问 `/`，头部右侧（桌面）多出「场外基金」按钮，点击跳转 `/otc-funds`
   - [ ] 切到移动端断点（≤ 768px），汉堡菜单展开后能看到「场外基金」条目
   - [ ] 工具箱出现第 4 张「场外基金」卡，副标题含"股票型 / 混合型 / 指数型 / 债券型 / QDII / FOF 六大类"
   - [ ] 卡上"进入"按钮 → `/otc-funds`；两个 quickLink chip 分别为"对比 → /otc-funds"和"详情 → /otc-fund"
   - [ ] 现有 3 张卡（基金对比 / 基金分析 / QDII 估值）和 QDII 专题页均不受影响

## 不在范围

- 调整 `ToolboxSection` grid 列数（4 张以内不需要）
- 单独的"场外基金" hero 区/区块（用户没要求，避免功能膨胀）
- 修改 `otc-funds.tsx` / `otc-fund.tsx` 现有行为
- 缓存策略 / 数据预取（loader 已有内存缓存）
