import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/market-data", "routes/api.market-data.ts"),
] satisfies RouteConfig;
