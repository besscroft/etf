import { getMarketData } from "~/lib/market-data";
import type { Route } from "./+types/api.market-data";

export async function loader({}: Route.LoaderArgs) {
  const data = await getMarketData();
  return data;
}
