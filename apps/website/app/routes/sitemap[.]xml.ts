import type { Route } from "./+types/sitemap[.]xml";
import { SITE_URL, absUrl } from "~/lib/seo";
import { getAllQDIIFundData, getAllOTCFundData } from "~/lib/market-data";

/**
 * 资源路由：返回 sitemap.xml
 * - 12 个静态路由 + 全部 fund/:code 动态路由（用内存缓存的全量基金列表拼装）
 * - 包含 loc / lastmod / changefreq / priority 四要素
 * - 缓存 1 小时，避免每次爬虫请求都重新计算
 */

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

/** 转义 XML 特殊字符（防止基金名/描述里的 & < > 破坏 XML 结构） */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 构造 <url> 节点 */
function renderUrl(e: SitemapEntry): string {
  return [
    "  <url>",
    `    <loc>${xmlEscape(e.loc)}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : "",
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : "",
    e.priority != null ? `    <priority>${e.priority.toFixed(1)}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function loader(_args: Route.LoaderArgs) {
  // 1) 静态路由
  const staticEntries: SitemapEntry[] = [
    { loc: absUrl("/"), changefreq: "daily", priority: 1.0 },
    { loc: absUrl("/cn/funds"), changefreq: "daily", priority: 0.9 },
    { loc: absUrl("/cn/fund"), changefreq: "daily", priority: 0.8 },
    { loc: absUrl("/otc-funds"), changefreq: "daily", priority: 0.9 },
    { loc: absUrl("/otc-fund"), changefreq: "daily", priority: 0.8 },
    { loc: absUrl("/global/stable"), changefreq: "weekly", priority: 0.7 },
    { loc: absUrl("/qdii"), changefreq: "daily", priority: 0.9 },
    { loc: absUrl("/qdii-valuation"), changefreq: "hourly", priority: 0.8 },
    { loc: absUrl("/nasdaq"), changefreq: "daily", priority: 0.8 },
    { loc: absUrl("/sp500"), changefreq: "daily", priority: 0.8 },
    { loc: absUrl("/active"), changefreq: "daily", priority: 0.8 },
  ];

  // 2) 动态 fund 详情页（并行取两个数据源，sitemap 上下文不在 SSR 请求里，所以 loaderData 用不到）
  // 注意：getAllQDIIFundData / getAllOTCFundData 在 lib/market-data.ts 内部有内存缓存，反复调用成本可控
  const [qdiiFunds, otcFunds] = await Promise.all([
    getAllQDIIFundData().catch(() => []),
    getAllOTCFundData().catch(() => []),
  ]);

  const fundEntries: SitemapEntry[] = [
    ...qdiiFunds.map<SitemapEntry>((f) => ({
      loc: absUrl(`/fund/${f.code}`),
      changefreq: "daily",
      priority: 0.7,
    })),
    ...otcFunds.map<SitemapEntry>((f) => ({
      loc: absUrl(`/fund/${f.code}`),
      changefreq: "daily",
      priority: 0.6,
    })),
  ];

  // 3) 去重（同一 code 在两个列表中可能重复出现）
  const seen = new Set<string>();
  const allEntries = [...staticEntries, ...fundEntries].filter((e) => {
    if (seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });

  // 4) 生成 XML
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allEntries.map(renderUrl),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
