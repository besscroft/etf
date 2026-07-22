import type { AShareMarket, OrderBookLevel, StockOrderBook, StockQuote } from "./stock-data";

export interface SinaMarketSnapshot {
  quote: StockQuote;
  orderBook: StockOrderBook;
}

function symbolFor(code: string, market: AShareMarket): string {
  const prefix = market === "SH" ? "sh" : market === "SZ" ? "sz" : "bj";
  return `${prefix}${code}`;
}

function value(parts: string[], index: number): number | null {
  const parsed = Number(parts[index]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseShanghaiTimestamp(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(time)) return null;
  const timestamp = Date.parse(`${date}T${time}+08:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function level(parts: string[], volumeIndex: number, priceIndex: number): OrderBookLevel | null {
  const price = value(parts, priceIndex);
  const shares = value(parts, volumeIndex);
  if (price === null || shares === null) return null;
  return { price, volume: shares / 100, amount: price * shares };
}

export function parseSinaMarketSnapshot(
  payload: string,
  code: string,
  market: AShareMarket,
  marketLabel: string,
): SinaMarketSnapshot | null {
  const match = payload.match(/="([\s\S]*)";?\s*$/);
  if (!match?.[1]) return null;
  const parts = match[1].split(",");
  if (parts.length < 32 || !parts[0]) return null;

  const open = value(parts, 1);
  const prevClose = value(parts, 2);
  const price = value(parts, 3);
  const high = value(parts, 4);
  const low = value(parts, 5);
  const volumeShares = value(parts, 8);
  const turnover = value(parts, 9);
  const timestamp = parseShanghaiTimestamp(parts[30] ?? "", parts[31] ?? "");
  const change = price !== null && prevClose !== null ? price - prevClose : null;
  const changePercent = change !== null && prevClose !== null ? (change / prevClose) * 100 : null;

  const bids = [
    level(parts, 10, 11),
    level(parts, 12, 13),
    level(parts, 14, 15),
    level(parts, 16, 17),
    level(parts, 18, 19),
  ].filter((item): item is OrderBookLevel => item !== null);
  const asks = [
    level(parts, 20, 21),
    level(parts, 22, 23),
    level(parts, 24, 25),
    level(parts, 26, 27),
    level(parts, 28, 29),
  ].filter((item): item is OrderBookLevel => item !== null);

  return {
    quote: {
      code,
      name: parts[0],
      price,
      change,
      changePercent,
      open,
      high,
      low,
      prevClose,
      volume: volumeShares === null ? null : volumeShares / 100,
      turnover,
      turnoverRate: null,
      timestamp,
      source: "sina",
      market,
      marketLabel,
    },
    orderBook: {
      code,
      asks,
      bids,
      timestamp,
      source: "sina",
    },
  };
}

export async function getSinaMarketSnapshot(
  code: string,
  market: AShareMarket,
  marketLabel: string,
): Promise<SinaMarketSnapshot | null> {
  try {
    const response = await fetch(`https://hq.sinajs.cn/list=${symbolFor(code, market)}`, {
      headers: {
        Referer: "https://finance.sina.com.cn/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const payload = new TextDecoder("gb18030").decode(bytes);
    return parseSinaMarketSnapshot(payload, code, market, marketLabel);
  } catch {
    return null;
  }
}
