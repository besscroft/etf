import type { Route } from "./+types/api.a-share-ranking";
import { getAshareRankings, type RankingItem, type RankingKind } from "~/lib/stock-data";
import { buildMarketDataMeta, type MarketDataMeta } from "~/lib/stock-market";

const VALID_KINDS: RankingKind[] = ["gainers", "losers", "turnoverRate", "amount"];

export async function loader({ request }: Route.LoaderArgs): Promise<{
  kind: RankingKind;
  items: RankingItem[];
  fetchedAt: string;
  meta: MarketDataMeta;
}> {
  const url = new URL(request.url);
  const rawKind = (url.searchParams.get("kind") ?? "gainers").trim();
  const kind: RankingKind = (VALID_KINDS as string[]).includes(rawKind)
    ? (rawKind as RankingKind)
    : "gainers";
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? 50));

  try {
    const items = await getAshareRankings(kind, limit);
    const meta = buildMarketDataMeta({
      source: items.length > 0 ? "eastmoney" : "unavailable",
      sourceTimestamp: items.length > 0 ? Date.now() : null,
      warnings: items.length > 0 ? [] : ["排行行情暂时不可用"],
    });
    return { kind, items, fetchedAt: meta.fetchedAt, meta };
  } catch {
    const meta = buildMarketDataMeta({
      source: "unavailable",
      sourceTimestamp: null,
      warnings: ["排行行情暂时不可用"],
    });
    return { kind, items: [], fetchedAt: meta.fetchedAt, meta };
  }
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 50;
  return Math.min(100, Math.max(1, Math.floor(limit)));
}
