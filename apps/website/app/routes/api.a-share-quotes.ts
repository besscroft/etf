import type { Route } from "./+types/api.a-share-quotes";
import { getStockQuotesBatch } from "~/lib/stock-data";

interface QuotesResponse {
  quotes: Array<{
    code: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    prevClose: number;
    volume: number;
    turnover: number;
    market: string;
    marketLabel: string;
  }>;
  fetchedAt: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<QuotesResponse> {
  const url = new URL(request.url);
  const codes = (url.searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^\d{6}$/.test(c))
    .slice(0, 100);

  const map = await getStockQuotesBatch(codes);

  return {
    quotes: [...map.values()].map((q) => ({
      code: q.code,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      open: q.open,
      high: q.high,
      low: q.low,
      prevClose: q.prevClose,
      volume: q.volume,
      turnover: q.turnover,
      market: q.market,
      marketLabel: q.marketLabel,
    })),
    fetchedAt: new Date().toISOString(),
  };
}
