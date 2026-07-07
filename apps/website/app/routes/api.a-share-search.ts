import type { Route } from "./+types/api.a-share-search";
import {
  searchAshareStocks,
  type AShareSearchResponse,
  type StockSearchItem,
} from "~/lib/stock-data";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function loader({ request }: Route.LoaderArgs): Promise<AShareSearchResponse> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT));

  try {
    const results = await searchAshareStocks(query, limit);
    return {
      query,
      results,
      fetchedAt: new Date().toISOString(),
      message: buildMessage(query, results, limit),
    };
  } catch {
    return {
      query,
      results: [],
      fetchedAt: new Date().toISOString(),
      message: "A 股搜索暂时不可用，请稍后再试。",
    };
  }
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function buildMessage(
  query: string,
  results: StockSearchItem[],
  limit: number,
): string | undefined {
  if (!query) return undefined;
  if (results.length >= limit) return "结果较多，可继续输入代码、名称或拼音缩写缩小范围。";
  if (results.length === 0) return "没有找到匹配的沪深京 A 股股票。";
  return undefined;
}
