import { getDomesticHomeData } from "~/lib/domestic-market";
import type { Route } from "./+types/api.market-data";

export async function loader(_args: Route.LoaderArgs) {
  const data = await getDomesticHomeData();
  return data;
}
