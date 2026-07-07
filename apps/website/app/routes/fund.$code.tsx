import type { Route } from "./+types/fund.$code";
import { redirect } from "react-router";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.code} 场外基金详情跳转中` },
    { name: "robots", content: "noindex,follow" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  throw redirect(`/otc-fund?code=${encodeURIComponent(params.code)}`);
}

export default function LegacyFundRedirect() {
  return null;
}
