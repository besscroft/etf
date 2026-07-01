import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/market-data", "routes/api.market-data.ts"),
  route("fund/:code", "routes/fund.$code.tsx"),
  route("cn/funds", "routes/compare.tsx"),
  route("cn/fund", "routes/analysis.tsx"),
  route("otc-funds", "routes/otc-funds.tsx"),
  route("otc-fund", "routes/otc-fund.tsx"),
  route("global/stable", "routes/stable.tsx"),
  route("qdii", "routes/qdii.tsx"),
  route("qdii-valuation", "routes/qdii-valuation.tsx"),
  route("nasdaq", "routes/nasdaq.tsx"),
  route("sp500", "routes/sp500.tsx"),
  route("active", "routes/active.tsx"),
  // SEO 资源路由
  route("robots.txt", "routes/robots[.]txt.ts"),
  route("sitemap.xml", "routes/sitemap[.]xml.ts"),
] satisfies RouteConfig;
