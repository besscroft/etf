import type { Route } from "./+types/legacy.sp500";
import { redirect } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "入口已迁移 - ETFVoid" }];
}

export async function loader(_args: Route.LoaderArgs) {
  throw redirect("/etf");
}

export default function LegacySP500Route() {
  return null;
}
