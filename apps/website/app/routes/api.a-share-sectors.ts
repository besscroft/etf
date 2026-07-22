import type { Route } from "./+types/api.a-share-sectors";
import { getSectorQuotes, type SectorType } from "~/lib/stock-data";
import { buildMarketDataMeta } from "~/lib/stock-market";

const VALID_TYPES: SectorType[] = ["industry", "concept", "region"];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const rawType = url.searchParams.get("type") ?? "industry";
  const type = VALID_TYPES.includes(rawType as SectorType) ? (rawType as SectorType) : "industry";
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const items = await getSectorQuotes(type, limit, { bypassCache: true });
  const meta = buildMarketDataMeta({
    source: items.length > 0 ? "eastmoney" : "unavailable",
    sourceTimestamp: items.length > 0 ? Date.now() : null,
    warnings: items.length > 0 ? [] : ["板块行情暂时不可用"],
  });
  return { type, items, fetchedAt: meta.fetchedAt, meta };
}
