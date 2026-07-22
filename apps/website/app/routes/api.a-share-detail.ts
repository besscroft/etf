import type { Route } from "./+types/api.a-share-detail";
import {
  getStockCapitalFlow,
  getStockOrderBook,
  getStockMinuteTrend,
  type StockOrderBook,
  type StockCapitalFlow,
  type MinutePoint,
} from "~/lib/stock-data";
import { buildMarketDataMeta, type MarketDataMeta } from "~/lib/stock-market";

interface DetailResponse {
  code: string;
  orderBook: StockOrderBook | null;
  capitalFlow: StockCapitalFlow | null;
  minute: MinutePoint[] | null;
  fetchedAt: string;
  meta: MarketDataMeta;
  message?: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<DetailResponse> {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  const fieldsParam = (url.searchParams.get("fields") ?? "orderbook,capitalflow").trim();
  const fields = new Set(fieldsParam.split(",").map((f) => f.trim()));

  if (!/^\d{6}$/.test(code)) {
    return {
      code,
      orderBook: null,
      capitalFlow: null,
      minute: null,
      fetchedAt: new Date().toISOString(),
      meta: buildMarketDataMeta({
        source: "unavailable",
        sourceTimestamp: null,
        warnings: ["无效的股票代码"],
      }),
      message: "无效的股票代码",
    };
  }

  const [orderBook, capitalFlow, minute] = await Promise.all([
    fields.has("orderbook")
      ? getStockOrderBook(code, { bypassCache: true })
      : Promise.resolve(null),
    fields.has("capitalflow")
      ? getStockCapitalFlow(code, { bypassCache: true })
      : Promise.resolve(null),
    fields.has("minute") ? getStockMinuteTrend(code, { bypassCache: true }) : Promise.resolve(null),
  ]);

  const hasData = Boolean(orderBook || capitalFlow || minute?.length);
  const meta = buildMarketDataMeta({
    source: orderBook?.source ?? (hasData ? "eastmoney" : "unavailable"),
    sourceTimestamp: orderBook?.timestamp ?? (hasData ? Date.now() : null),
    warnings: hasData ? [] : ["行情详情暂时不可用"],
  });

  return {
    code,
    orderBook,
    capitalFlow,
    minute,
    fetchedAt: meta.fetchedAt,
    meta,
  };
}
