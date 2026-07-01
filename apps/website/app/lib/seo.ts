/**
 * SEO 集中工具
 * - 统一输出 Open Graph / Twitter Card / canonical / 标题模板
 * - 集中管理站点绝对 URL（避免在 12 个路由里重复拼接）
 * - JSON-LD 结构化数据生成（站点级 / 基金详情级）
 *
 * 类型严格遵循 React Router v7 的 MetaDescriptor 联合类型。
 */
import type { MetaDescriptor } from "react-router";

/** 站点主域名。dev/预发环境可通过 VITE_SITE_URL 覆盖 */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "https://etf.zzzvoid.com";

/** 站点名称（用于 og:site_name、品牌化 title 后缀） */
export const SITE_NAME = "ETFVoid";

/** 站点品牌主色（与 app.css 中 menu-gradient 起点色保持一致） */
export const THEME_COLOR = "#FFED46";

/** og/twitter 缺省图（站内自制 SVG 品牌卡；建议后续提供 1200x630 PNG 提升 Facebook/Twitter/微信兼容性） */
const FALLBACK_OG_IMAGE = `${SITE_URL}/og-image.svg`;

/** 拼接绝对 URL（自动处理首尾斜杠） */
export function absUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export type BuildMetaOptions = {
  /** 页面标题（不要带站点名后缀，函数会自动加） */
  title: string;
  /** 页面描述，控制在 80-160 字符 */
  description: string;
  /** 当前页面的相对路径（如 "/fund/513100"），用于 canonical/og:url */
  path: string;
  /** og:type，默认 "website"；基金详情等可传 "article" 或 "product" */
  type?: "website" | "article" | "product";
  /** 自定义 og:image，默认 fallback favicon */
  image?: string;
  /** 是否声明 noindex（如 404、临时页） */
  noindex?: boolean;
  /** 追加额外 meta 标签（如 JSON-LD 等特殊描述符） */
  extra?: MetaDescriptor[];
};

/**
 * 统一构造路由 meta() 返回值
 * 用法：return buildMeta({ title, description, path, type: "article" })
 */
export function buildMeta(opts: BuildMetaOptions): MetaDescriptor[] {
  const fullTitle = opts.title.includes(SITE_NAME) ? opts.title : `${opts.title} - ${SITE_NAME}`;
  const url = absUrl(opts.path);
  const image = absUrl(opts.image ?? FALLBACK_OG_IMAGE);
  const ogType = opts.type ?? "website";

  const meta: MetaDescriptor[] = [
    { title: fullTitle },
    { name: "description", content: opts.description },

    // canonical（绝对 URL，搜索引擎处理一致）
    { tagName: "link", rel: "canonical", href: url },

    // Open Graph（Facebook / 微信 / 微博 / 知乎 / LinkedIn 均按 og 解析）
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: ogType },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: opts.description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:locale", content: "zh_CN" },

    // Twitter Card（X / Twitter 专用）
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: opts.description },
    { name: "twitter:image", content: image },
  ];

  if (opts.noindex) {
    meta.push({ name: "robots", content: "noindex,nofollow" });
  }

  if (opts.extra?.length) {
    meta.push(...opts.extra);
  }

  return meta;
}

/**
 * 站点级 JSON-LD：WebSite + SearchAction
 * 在 root.tsx 渲染一次即可，每个页面不要再重复输出 WebSite
 *
 * 返回纯对象（不是 MetaDescriptor），方便在 JSX 中用 dangerouslySetInnerHTML 渲染
 */
export function buildSiteJsonLdObject(): unknown {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "zh-CN",
      description: "覆盖纳斯达克100、标普500被动指数及主动型QDII基金，提供费率对比与申购状态追踪",
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website-search`,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/cn/funds?funds={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

/** MetaDescriptor 包装版本（保留以便后续在路由 meta() 中复用） */
export function buildSiteJsonLd(): MetaDescriptor {
  // cast to any: LdJsonObject 是 react-router 内部类型未对外暴露
  return { "script:ld+json": buildSiteJsonLdObject() as any };
}

/**
 * 基金详情页 JSON-LD：FinancialProduct
 * Google 富媒体搜索会用这个来展示「基金/理财产品」类信息
 */
export interface FundJsonLdInput {
  code: string;
  name: string;
  fee?: string | null;
  manageRate?: string | null;
  sourceRate?: string | null;
  managers?: Array<{ name: string }>;
  performance?: {
    oneYear?: number | null;
    threeYear?: number | null;
  };
  path: string;
}

export function buildFundJsonLd(fund: FundJsonLdInput): MetaDescriptor {
  const url = absUrl(fund.path);
  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: fund.name,
    identifier: fund.code,
    url,
    category: "MutualFund",
    provider: {
      "@type": "Organization",
      name: fund.name,
    },
  };

  const feeText =
    fund.manageRate || fund.sourceRate
      ? `管理费率${fund.manageRate ?? "—"}，申购费率${fund.sourceRate ?? "—"}`
      : null;
  if (feeText) product.feesAndCommissionsSpecification = feeText;

  if (fund.performance?.oneYear != null) {
    product.oneYearReturn = `${fund.performance.oneYear}%`;
  }
  if (fund.performance?.threeYear != null) {
    product.threeYearReturn = `${fund.performance.threeYear}%`;
  }

  return { "script:ld+json": product };
}
