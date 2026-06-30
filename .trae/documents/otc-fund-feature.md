# 场外基金对比/详情功能

## Context

参考网站 `https://upup.vip/cn/funds`（场外基金对比）使用的是**东方财富 datacenter `RPT_FUND_RANK` + 天天基金 `pingzhongdata` / `fundcode_search.js` / `fundgz`**，与本项目数据源完全一致。

当前 `app/routes/compare.tsx`（`/cn/funds`）和 `app/routes/analysis.tsx`（`/cn/fund`）的 loader 都只调 `getAllQDIIFundData()`，返回的硬编码 QDII 子集（纳指100/标普500/美股主动），所以现在的"基金对比"实际只是 QDII 范围，没有覆盖股票型/混合型/指数型/债券型/FOF 等真正的场外基金。

**目标**：保留 QDII 专题页不变，新增独立的"场外基金"对比/详情入口（`/otc-funds`、`/otc-fund`），首页头部右上角加路由按钮、工具箱卡片副标题注明场外范围。

## 方案

### A. 数据层 — `app/lib/market-data.ts`

1. 新增类型：
   ```ts
   export type OTCCategory = "stock" | "hybrid" | "index" | "bond" | "qdii" | "fof";
   export interface OTCClassifiedFundData extends OTCFundData {
     category: OTCCategory;
     categoryLabel: string;
   }
   ```
2. 新增 5 个精选代码常量（每类 10-20 只，参考天天基金"开放式基金排行"近 1 年收益 + 规模 top）：
   - `STOCK_OTC_CODES`（股票型）
   - `HYBRID_OTC_CODES`（混合型）
   - `INDEX_OTC_CODES`（指数型）
   - `BOND_OTC_CODES`（债券型）
   - `FOF_OTC_CODES`（FOF）

3. 新增 `getAllOTCFundData()`：复用 `getOTCFundData()`，`Promise.all` 拉 5 个新子集 + QDII 既有 3 组（共 8 个 batch），打 `category` / `categoryLabel` 标签后合并返回。QDII 三个子集打 `"qdii"` 标签（与 `getAllQDIIFundData` 解耦）。
4. `getAllQDIIFundData()` **完全不动**（首页 QDII 专题继续用）。
5. 复用现有 `getFundDetailData()` / `getFundCompareData()` / `searchFundCode()`，无需修改。A股重仓股在新浪 `gb_` 前缀会失败，详情页 `topHoldings` 自然为空（已在 `getFundDetailData` 内 try-catch），无需特殊处理。

### B. 路由 — `app/routes.ts`

```ts
route("otc-funds", "routes/otc-funds.tsx"),
route("otc-fund", "routes/otc-fund.tsx"),
```

### C. 新建页面

#### `app/routes/otc-funds.tsx`（场外基金对比）

- 基本复用 `compare.tsx` 的 loader 模式：`getAllOTCFundData()` 拉列表 + `getFundCompareData(codes)` 拉详情。
- 桌面端顶部加"分类"过滤器（全部/股票/混合/指数/债券/QDII/FOF），URL 同步 `?category=` 与 `?funds=`，刷新可保留。
- 移动端：在 `MobileCompareLayout` 顶部 Tab 之上加一行分类 chip。
- 标题改为「场外基金对比」。
- `ShareExport module="fund-compare"` 直接复用现有模板。

#### `app/routes/otc-fund.tsx`（场外基金详情）

- 基本复用 `analysis.tsx` 的 loader 模式：`getAllOTCFundData()` 拉列表 + `getFundDetailData(code)` 拉详情。
- 搜索面板支持按分类预筛选（默认全部）。
- 标题改为「场外基金详情」。
- 详情卡片头部加分类徽章（如「股票型」），沿用 `OTCCategory` 标签。
- `ShareExport module="analysis"` 直接复用现有模板。

### D. 移动端组件微调 — `app/components/compare-mobile/mobile-compare-layout.tsx`

- props 新增 `title?: string`（默认"基金对比"），header 渲染 `{title ?? "基金对比"}`。
- `fundList` 形参已是 `Array<{code, name}>`，调用方在 `otc-funds.tsx` 里 `.map(({code, name}) => ({code, name}))` 即可，**零侵入**。
- 移动端分类 chip 列表加在 Tab 切换栏之上，复用现有视觉规范。

### E. 首页改造 — `app/routes/home.tsx`

1. `navItems` 末尾追加 `{ label: "场外基金", href: "/otc-funds" }`（桌面端和移动端共用同一数组，无需分别改）。
2. `ToolboxSection` 现有第 1、2 张卡：
   - 副标题改为「覆盖股票 / 混合 / 指数 / 债券 / QDII / FOF 等场外基金」。
   - href 改为 `/otc-funds` / `/otc-fund`。
3. 第 3 张「QDII 估值」卡保持不变。

## 关键文件

| 路径                                                                                 | 动作                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `c:\github\etf\apps\website\app\lib\market-data.ts`                                  | 新增类型 + 5 个代码常量 + `getAllOTCFundData()` |
| `c:\github\etf\apps\website\app\routes.ts`                                           | 新增 2 条路由                                   |
| `c:\github\etf\apps\website\app\routes\otc-funds.tsx`                                | 新建（克隆 `compare.tsx` 改造）                 |
| `c:\github\etf\apps\website\app\routes\otc-fund.tsx`                                 | 新建（克隆 `analysis.tsx` 改造）                |
| `c:\github\etf\apps\website\app\components\compare-mobile\mobile-compare-layout.tsx` | props 加 `title?`                               |
| `c:\github\etf\apps\website\app\routes\home.tsx`                                     | navItems + 工具箱卡片副标题/链接                |

## 复用现有工具

- `getOTCFundData(codes)`、`getFundCompareData(codes)`、`getFundDetailData(code)`、`searchFundCode(keyword)`
- `MobileCompareLayout` / `FundSearchSheet` / `FundChipStrip` / `MetricsCompareCard` / `TrendChartMobile` / `PerformanceBarsMobile`
- `ShareExport` 的 `fund-compare` / `analysis` 模板
- `COMPARE_COLORS` / `MAX_COMPARE` / `COMPARE_TABS` 常量
- `extractJsVar` / `extractJsArray` / `cachedFetch` / `fetchText` / `fetchJson` / `fetchTextGBK`

## 验证

1. `vp install`（确认依赖完整）
2. `vp check` — 格式化、lint、类型检查
3. `vp test` — 跑测试
4. `vp run website#dev` 启动 dev，浏览器中：
   - 访问 `/` → 头部右侧多出「场外基金」入口，工具箱前两张卡副标题已更新
   - 点击头部「场外基金」→ 跳转 `/otc-funds`
   - 搜索/选择 ≥2 只基金 → 桌面端走 `CompareContent`，移动端走 `MobileCompareLayout`，三段式 Tab 切换正常
   - 切换分类过滤器（全部/股票/...）→ URL 同步 `?category=`
   - 点击「基金分析」卡 → `/otc-fund`，搜索 161725 → 详情页核心指标/走势/收益/经理/分类徽章均显示
   - 现有 `/nasdaq` `/sp500` `/active` `/cn/funds` `/cn/fund` 全部不受影响（QDII 专题仍走 `getAllQDIIFundData`）
5. 移动端断点（≤ 768px）走 `MobileCompareLayout`，验证 chip 横向滚动 + 抽屉搜索 + 底部操作栏
