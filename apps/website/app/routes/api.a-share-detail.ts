import type { Route } from "./+types/api.a-share-detail";
import {
  getStockCapitalFlow,
  getStockOrderBook,
  type StockOrderBook,
  type StockCapitalFlow,
} from "~/lib/stock-data";

interface DetailResponse {
  code: string;
  orderBook: StockOrderBook | null;
  capitalFlow: StockCapitalFlow | null;
  fetchedAt: string;
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
      fetchedAt: new Date().toISOString(),
      message: "无效的股票代码",
    };
  }

  const [orderBook, capitalFlow] = await Promise.all([
    fields.has("orderbook")
      ? getStockOrderBook(code, { bypassCache: true })
      : Promise.resolve(null),
    fields.has("capitalflow")
      ? getStockCapitalFlow(code, { bypassCache: true })
      : Promise.resolve(null),
  ]);

  return {
    code,
    orderBook,
    capitalFlow,
    fetchedAt: new Date().toISOString(),
  };
}
