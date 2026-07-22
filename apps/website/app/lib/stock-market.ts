export type MarketDataSource = "eastmoney" | "sina" | "unavailable";

export type MarketFreshness = "live" | "delayed" | "stale" | "unavailable";

export type MarketPhase = "preopen" | "open" | "lunch" | "closed";

export interface MarketDataMeta {
  source: MarketDataSource;
  sourceTimestamp: number | null;
  fetchedAt: string;
  freshness: MarketFreshness;
  marketPhase: MarketPhase;
  warnings: string[];
}

export interface MarketDataResult<T> {
  data: T;
  meta: MarketDataMeta;
}

interface ShanghaiClock {
  date: string;
  hour: number;
  minute: number;
  weekday: string;
}

const SHANGHAI_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

function getShanghaiClock(value: Date): ShanghaiClock {
  const parts = Object.fromEntries(
    SHANGHAI_FORMATTER.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday,
  };
}

export function getMarketPhase(now = new Date(), sourceTimestamp?: number | null): MarketPhase {
  const current = getShanghaiClock(now);
  if (current.weekday === "Sat" || current.weekday === "Sun") return "closed";

  const minutes = current.hour * 60 + current.minute;
  let phase: MarketPhase;
  if (minutes < 9 * 60 + 30) phase = "preopen";
  else if (minutes <= 11 * 60 + 30) phase = "open";
  else if (minutes < 13 * 60) phase = "lunch";
  else if (minutes <= 15 * 60) phase = "open";
  else phase = "closed";

  if ((phase === "open" || phase === "lunch") && sourceTimestamp) {
    const source = getShanghaiClock(new Date(sourceTimestamp));
    if (source.date !== current.date) return "closed";
  }
  return phase;
}

export function buildMarketDataMeta({
  source,
  sourceTimestamp,
  warnings = [],
  now = new Date(),
}: {
  source: MarketDataSource;
  sourceTimestamp: number | null;
  warnings?: string[];
  now?: Date;
}): MarketDataMeta {
  const marketPhase = getMarketPhase(now, sourceTimestamp);
  const age = sourceTimestamp ? Math.max(0, now.getTime() - sourceTimestamp) : Infinity;
  const liveLimit = marketPhase === "open" ? 30_000 : 24 * 60 * 60 * 1000;
  const staleLimit = marketPhase === "open" ? 2 * 60 * 1000 : 4 * 24 * 60 * 60 * 1000;
  const freshness: MarketFreshness =
    source === "unavailable" || !sourceTimestamp
      ? "unavailable"
      : age <= liveLimit
        ? "live"
        : age <= staleLimit
          ? "delayed"
          : "stale";

  return {
    source,
    sourceTimestamp,
    fetchedAt: now.toISOString(),
    freshness,
    marketPhase,
    warnings,
  };
}

export function unavailableMarketMeta(warnings: string[] = []): MarketDataMeta {
  return buildMarketDataMeta({ source: "unavailable", sourceTimestamp: null, warnings });
}
