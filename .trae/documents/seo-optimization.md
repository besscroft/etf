# SEO 优化方案（进阶包）

## Context

用户希望靠广告费维持生活，**广告收入 = 搜索引擎收录量 × 社交分享点击率 × 广告位曝光**。当前 `https://etf.zzzvoid.com` 存在多项硬伤：

1. **`<html lang="en">`** —— 中文站却声明英文，搜索引擎会判定语言/地区不匹配，直接影响中文搜索收录
2. **无 Open Graph / Twitter Card** —— 微信、微博、知乎、X(Twitter) 分享全是无标题无图的纯链接，点击率比带卡片的低 60%+
3. **无 canonical** —— `fund/:code` 动态页可能因查询参数产生重复内容，被搜索引擎惩罚
4. **无 sitemap.xml / robots.txt** —— 搜索引擎找不到基金详情页（动态路由没有 sitemap 几乎不会自然收录）
5. **无结构化数据** —— 错失谷歌「基金 / 理财产品」富媒体展示位
6. **12 个路由 meta 重复手写** —— title 模板分散，扩展时容易漏 og/twitter

目标：完成进阶包（基础 SEO + 动态详情页优化 + JSON-LD + sitemap 资源路由），让站点可被搜索引擎正常收录，社交分享有卡片，谷歌有结构化富媒体。

不在本计划做：og-image 动态生成、PWA manifest、Google Analytics（用户已选「先不做」）。

---

## 实施步骤

### 1. 新建 SEO 集中工具

**新建** `c:\github\etf\apps\website\app\lib\seo.ts`

导出：

- `SITE_URL: string` —— 默认 `"https://etf.zzzvoid.com"`，可通过 `import.meta.env.VITE_SITE_URL` 覆盖（dev/预发环境可临时改）
- `buildMeta(opts: { title, description, path, type?, image?, noindex? })` —— 统一返回数组，包含：
  - `{ title }`
  - `{ name: "description" }`
  - canonical `link`
  - og: site_name / type / title / description / url / locale=zh_CN / image
  - twitter: card=summary_large_image / title / description / image
  - 可选 `robots: { name, content: "noindex" }`
- `buildFundJsonLd(fund)` —— `FinancialProduct` schema（覆盖 code/name/fee/provider=fund.name/等）
- `buildSiteJsonLd()` —— 站点级 `WebSite` + `SearchAction`
- 内部 helper `absUrl(path)` —— 拼绝对 URL，避免各处重复 `SITE_URL + path`

**为何先建工具**：后续 12 个路由都要改造，工具不写出来会到处复制粘贴 og/twitter 模板，违反「最小变更」和 DRY 原则。

---

### 2. 修改 root.tsx（全局 SEO 基底）

修改 `c:\github\etf\apps\website\app\root.tsx`：

- L29 `<html lang="en">` → `<html lang="zh-CN">`（**最高优先级，单字符修复就解锁中文 SEO**）
- `links()` 追加：
  - `{ rel: "canonical", href: SITE_URL + "/" }`（页面级 meta 会再覆盖）
  - `{ rel: "icon", href: "/favicon.ico" }`（补显式声明，部分浏览器需要）
  - `{ rel: "apple-touch-icon", href: "/favicon.ico" }`（暂无专用图标时复用 favicon）
- `<head>` 内 `<Meta />` 之后追加：
  - `<meta name="theme-color" content="#FFED46" />`（取自当前品牌渐变色）
  - `<meta name="format-detection" content="telephone=no" />`（金融站常见）
  - 全局 `<script type="application/ld+json">{...buildSiteJsonLd()}</script>`

**重要**：站点级 JSON-LD 在 root.tsx 渲染一次即可，**不要每个路由都重复输出** —— 重复 JSON-LD 是 Google 警告项。

---

### 3. 改造 12 个路由的 meta()

**模式**：每个路由用 `buildMeta()` 替换原来手写的 `[{title}, {description}]` 数组。

具体改动：

| 文件                              | path              | 备注                                                                                                                                                                     |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `routes/home.tsx:35-43`           | `/`               | type=website                                                                                                                                                             |
| `routes/compare.tsx:16-21`        | `/cn/funds`       | —                                                                                                                                                                        |
| `routes/analysis.tsx:32-40`       | `/cn/fund`        | —                                                                                                                                                                        |
| `routes/fund.$code.tsx:20-25`     | `/fund/${code}`   | **重点优化**：从 loader 取 `fund.name`，title 改为 `"${fund.name} (${code}) - ETFVoid"`，description 嵌入 `fee/最大回撤/管理人` 等真实数据，追加 `buildFundJsonLd(fund)` |
| `routes/otc-funds.tsx:34-43`      | `/otc-funds`      | —                                                                                                                                                                        |
| `routes/otc-fund.tsx:41-50`       | `/otc-fund`       | type=article（详情页）                                                                                                                                                   |
| `routes/stable.tsx:22-31`         | `/global/stable`  | —                                                                                                                                                                        |
| `routes/qdii.tsx:26-34`           | `/qdii`           | —                                                                                                                                                                        |
| `routes/qdii-valuation.tsx:37-45` | `/qdii-valuation` | —                                                                                                                                                                        |
| `routes/nasdaq.tsx:24-32`         | `/nasdaq`         | —                                                                                                                                                                        |
| `routes/sp500.tsx:24-32`          | `/sp500`          | —                                                                                                                                                                        |
| `routes/active.tsx:24-32`         | `/active`         | —                                                                                                                                                                        |

**fund.$code.tsx 是进阶包的关键收益点**：当前 title 只用 code 字符串（`基金 513100`），搜索引擎完全不知道这页面讲什么。改用真实基金名后，长尾搜索（如「513100 是什么基金」「纳斯达克100 ETF 费率」）才能命中。

---

### 4. 新增资源路由

**新建** `c:\github\etf\apps\website\app\routes\robots[.]txt.ts`

```ts
import type { Route } from "./+types/robots[.]txt";
import { SITE_URL } from "~/lib/seo";

export async function loader(_: Route.LoaderArgs) {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

**新建** `c:\github\etf\apps\website\app\routes\sitemap[.]xml.ts`

- 并行调用 `getAllQDIIFundData()`（约 30+ 只基金）和 `getAllOTCFundData()`（约 300+ 只场外基金）
- 输出 XML，包含 12 个静态路由 + 全部 `fund/:code` 详情页
- 每条 URL 含 `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`
- Content-Type: `application/xml; charset=utf-8`

**注册到** `c:\github\etf\apps\website\app\routes.ts`：

```ts
route("robots.txt", "routes/robots[.]txt.ts"),
route("sitemap.xml", "routes/sitemap[.]xml.ts"),
```

**为何用资源路由**：React Router v7 的 resource route（loader 返回 `Response` 对象）是声明式标准做法，与项目现有的 `api.market-data.ts` 同模式。

**为何要把所有 fund code 灌进 sitemap**：基金的 `fund/:code` 是动态路由，外部链接稀少、PR 流转慢，没有 sitemap 引导搜索引擎会收录很慢。sitemap 是基金类站点 SEO 的「主动推送」机制。

---

## 关键文件清单

| 路径                            | 动作                                   | 优先级     |
| ------------------------------- | -------------------------------------- | ---------- |
| `app/lib/seo.ts`                | 新建                                   | 必需       |
| `app/root.tsx`                  | 改 lang + 加 meta/links                | 必需       |
| `app/routes.ts`                 | 注册 2 个资源路由                      | 必需       |
| `app/routes/home.tsx`           | meta 改 buildMeta                      | 必需       |
| `app/routes/fund.$code.tsx`     | meta 改 buildMeta + 嵌入基金名/JSON-LD | **高收益** |
| `app/routes/compare.tsx`        | meta 改 buildMeta                      | 必需       |
| `app/routes/analysis.tsx`       | meta 改 buildMeta                      | 必需       |
| `app/routes/otc-funds.tsx`      | meta 改 buildMeta                      | 必需       |
| `app/routes/otc-fund.tsx`       | meta 改 buildMeta                      | 必需       |
| `app/routes/qdii.tsx`           | meta 改 buildMeta                      | 必需       |
| `app/routes/qdii-valuation.tsx` | meta 改 buildMeta                      | 必需       |
| `app/routes/nasdaq.tsx`         | meta 改 buildMeta                      | 必需       |
| `app/routes/sp500.tsx`          | meta 改 buildMeta                      | 必需       |
| `app/routes/active.tsx`         | meta 改 buildMeta                      | 必需       |
| `app/routes/stable.tsx`         | meta 改 buildMeta                      | 必需       |
| `app/routes/robots[.]txt.ts`    | 新建                                   | 必需       |
| `app/routes/sitemap[.]xml.ts`   | 新建                                   | 必需       |

共 16 个文件（1 新工具 + 1 root + 1 routes + 12 路由 + 2 资源路由 + sitemap 路由），其中 12 个路由改造模式一致，单点改完后其余 11 个套用即可。

---

## 验证

实施后按以下顺序验证：

1. **类型检查**：`vp run website#typecheck`（确认 buildMeta 签名 / Route.MetaArgs 类型正确）
2. **构建**：`vp run website#build`（确认 sitemap 资源路由能 SSR 编译）
3. **启动 dev server**：`vp dev`，等待 5s
4. **HTML 元数据验证**（用 curl + grep）：

   ```bash
   curl -s http://localhost:5173/ | grep -E 'lang="zh-CN"|og:title|twitter:card|application/ld\+json'
   curl -s http://localhost:5173/fund/513100 | grep -E '<title>.*纳斯达克|FinancialProduct'
   curl -sI http://localhost:5173/robots.txt
   curl -s http://localhost:5173/robots.txt
   curl -s http://localhost:5173/sitemap.xml | head -30
   ```

   预期：
   - `lang="zh-CN"` 出现
   - `og:title` / `og:description` / `og:url` / `og:image` / `og:site_name` / `og:locale=zh_CN` 都出现
   - `twitter:card=summary_large_image` 出现
   - `<script type="application/ld+json">` 出现（站点级 + 基金详情页含 `FinancialProduct`）
   - 基金详情页 title 含真实基金名（如「纳斯达克100ETF」），不再是「基金 513100」
   - `/robots.txt` 返回 200，`Content-Type: text/plain`
   - `/sitemap.xml` 返回 200，`Content-Type: application/xml`，XML 结构合法，含多条 `<url>`

5. **可选 — 外部校验**：
   - 浏览器打开 [Google 富媒体搜索测试](https://search.google.com/test/rich-results) 测 `/fund/513100`（需 build 部署后）
   - 浏览器打开 [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 测首页（验证 og）

---

## 风险与注意

- **不引入新依赖**：全部用项目已有的 React Router 7 / TypeScript 完成
- **不破坏 SSR 性能**：sitemap loader 复用现有 `getAllQDIIFundData / getAllOTCFundData`（二者都有内存缓存，参考 `lib/market-data.ts:1-15` 注释）
- **canonical 绝对路径**：必须用 `SITE_URL + path`，不能用相对路径 —— 搜索引擎对相对 canonical 处理不一致
- **JSON-LD 数量**：站点级只在 root 输出一次，详情页只输出 `FinancialProduct`；Google 拒绝同一页多个 `WebSite`
- **不删除现有 title/description 内容**：仅统一格式，保留所有中文字符串（很多是手工优化的长尾词）
- **fund.$code.tsx 的 loader 抛 404**：404 页面不需要 canonical/og，按 React Router 默认行为（ErrorBoundary）会继承 root.tsx 的 meta，但页面级 meta() 在错误时不执行，OK
