import type { Route } from "./+types/analysis";
import { redirect } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "场外基金详情跳转中" }, { name: "robots", content: "noindex,follow" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  throw redirect(code ? `/otc-fund?code=${encodeURIComponent(code)}` : "/otc-fund");
}

export default function LegacyAnalysisRedirect() {
  return null;
}
