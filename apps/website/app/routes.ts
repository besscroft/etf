import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/market-data", "routes/api.market-data.ts"),
  route("api/a-share-search", "routes/api.a-share-search.ts"),
  route("api/a-share-detail", "routes/api.a-share-detail.ts"),
  route("api/a-share-quotes", "routes/api.a-share-quotes.ts"),
  route("api/a-share-ranking", "routes/api.a-share-ranking.ts"),
  route("api/a-share-sectors", "routes/api.a-share-sectors.ts"),
  route("a-shares", "routes/a-shares.tsx"),
  route("sectors", "routes/sectors.tsx"),
  route("watchlist", "routes/watchlist.tsx"),
  route("etf", "routes/etf.tsx"),
  route("etf/:code", "routes/etf.$code.tsx"),
  route("fund/:code", "routes/fund.$code.tsx"),
  route("stock/:code", "routes/stock.$code.tsx"),
  route("cn/funds", "routes/compare.tsx"),
  route("cn/fund", "routes/analysis.tsx"),
  route("otc-funds", "routes/otc-funds.tsx"),
  route("otc-fund", "routes/otc-fund.tsx"),
  // SEO 资源路由
  route("robots.txt", "routes/robots[.]txt.ts"),
  route("sitemap.xml", "routes/sitemap[.]xml.ts"),
] satisfies RouteConfig;
