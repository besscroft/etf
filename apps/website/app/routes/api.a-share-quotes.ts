import type { Route } from "./+types/api.a-share-quotes";
import { getStockQuotesBatch } from "~/lib/stock-data";
import type { StockQuote } from "~/lib/stock-data";
import { buildMarketDataMeta, type MarketDataMeta } from "~/lib/stock-market";

interface QuotesResponse {
  quotes: StockQuote[];
  fetchedAt: string;
  meta: MarketDataMeta;
}

export async function loader({ request }: Route.LoaderArgs): Promise<QuotesResponse> {
  const url = new URL(request.url);
  const codes = (url.searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^\d{6}$/.test(c))
    .slice(0, 100);

  const map = await getStockQuotesBatch(codes);
  const quotes = [...map.values()];
  const sourceQuote = quotes.find((quote) => quote.source !== "unavailable") ?? null;
  const meta = buildMarketDataMeta({
    source: sourceQuote?.source ?? "unavailable",
    sourceTimestamp: sourceQuote?.timestamp ?? null,
    warnings: sourceQuote ? [] : ["批量行情暂时不可用"],
  });

  return {
    quotes,
    fetchedAt: meta.fetchedAt,
    meta,
  };
}
