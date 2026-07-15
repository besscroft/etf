import type { Route } from "./+types/api.a-share-ranking";
import { getAshareRankings, type RankingItem, type RankingKind } from "~/lib/stock-data";

const VALID_KINDS: RankingKind[] = ["gainers", "losers", "turnoverRate", "amount"];

export async function loader({ request }: Route.LoaderArgs): Promise<{
  kind: RankingKind;
  items: RankingItem[];
  fetchedAt: string;
}> {
  const url = new URL(request.url);
  const rawKind = (url.searchParams.get("kind") ?? "gainers").trim();
  const kind: RankingKind = (VALID_KINDS as string[]).includes(rawKind)
    ? (rawKind as RankingKind)
    : "gainers";
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? 50));

  try {
    const items = await getAshareRankings(kind, limit);
    return { kind, items, fetchedAt: new Date().toISOString() };
  } catch {
    return { kind, items: [], fetchedAt: new Date().toISOString() };
  }
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 50;
  return Math.min(100, Math.max(1, Math.floor(limit)));
}
