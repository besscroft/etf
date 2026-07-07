import type { Route } from "./+types/legacy.qdii";
import { redirect } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "入口已迁移 - ETFVoid" }];
}

export async function loader(_args: Route.LoaderArgs) {
  throw redirect("/otc-funds");
}

export default function LegacyQDIIRoute() {
  return null;
}
