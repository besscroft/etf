/**
 * 股票详情数据层
 *
 * 与 market-data.ts 平级，集中管理单只股票的所有外部数据源：
 * - 实时价：东方财富 push2
 * - K线：东方财富 push2his
 * - 分时：东方财富 push2his trends2
 * - 公司概况：东方财富 F10
 * - 财务指标：东方财富 F10 NewFinanceAnalysis
 * - 近期新闻：东方财富 search-api-web
 *
 * 通用约定（与 market-data.ts 保持一致）：
 * - 复用 cachedFetch / fetchJson，不重新实现
 * - 默认 fail-soft：单只股票不存在 → 返回 null；不抛错
 * - getStockQuote 兜底返回 price=0 占位，UI 显示 "—"
 *
 * 市场前缀（secid.market）：
 * - 6xxxxx → 1.SH（沪 A）
 * - 0xxxxx, 3xxxxx → 0.SZ（深 A / 创业板）
 * - 4xxxxx, 8xxxxx, 920xxx → 0.BJ（北交所）
 * - 5xxxxx → 1.SH（沪 ETF/封闭基金）
 * - 1xxxxx → 0.SZ（深 ETF/LOF 等场内基金）
 * - 5 位数字 → 不支持（港股）
 * - 字母 → 不支持
 */

import { cachedFetch, fetchJson } from "./market-data";

/** 支持的境内市场 */
export type AShareMarket = "SH" | "SZ" | "BJ";

/** 境内行情品种 */
export type DomesticSecurityKind = "stock" | "etf";

export interface DomesticSecurityMeta {
  secid: number;
  prefix: AShareMarket;
  marketLabel: string;
  kind: DomesticSecurityKind;
}

/** 实时报价 */
export interface StockQuote {
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
  /** 数据时间戳（毫秒） */
  timestamp: number;
  market: AShareMarket;
  marketLabel: string;
}

/** K线数据点（OHLC + 成交 + 涨跌） */
export interface KLinePoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  amplitude: number;
  changePercent: number;
  changeAmount: number;
}

/** K线周期 */
export type KLinePeriod = "1d" | "1w" | "1m";

/** 行情图周期：分时 + K 线 */
export type MarketChartPeriod = "minute" | KLinePeriod;

/** 多周期 K 线数据 */
export type StockKLineMap = Record<KLinePeriod, KLinePoint[]>;

/** 分时数据点 */
export interface MinutePoint {
  time: string;
  price: number;
  avgPrice: number;
  volume: number;
  turnover: number;
}

/** 公司概况 */
export interface StockCompanyInfo {
  name: string;
  industry: string;
  listingDate: string;
  totalShares: string;
  circulatingShares: string;
  mainBusiness: string;
  profile: string;
}

/** 财务指标 */
export interface StockFinancials {
  eps: number | null;
  bvps: number | null;
  roe: number | null;
  grossMargin: number | null;
  debtRatio: number | null;
  pe: number | null;
  pb: number | null;
  ps: number | null;
  totalMarketCap: number | null;
  circulatingMarketCap: number | null;
  reportDate: string;
}

/** 近期新闻 */
export interface StockNewsItem {
  title: string;
  summary: string;
  source: string;
  publishTime: string;
  url: string;
}

/** A 股搜索结果项 */
export interface StockSearchItem extends StockQuote {
  pinyin: string;
  industry: string;
  area: string;
}

/** A 股搜索接口响应 */
export interface AShareSearchResponse {
  query: string;
  results: StockSearchItem[];
  fetchedAt: string;
  message?: string;
}

export interface EastmoneySuggestItem {
  Code?: string;
  Name?: string;
  PinYin?: string;
  Classify?: string;
  SecurityTypeName?: string;
}

interface EastmoneyClistRow {
  f2?: number | string;
  f3?: number | string;
  f4?: number | string;
  f5?: number | string;
  f6?: number | string;
  f12?: string;
  f14?: string;
  f15?: number | string;
  f16?: number | string;
  f17?: number | string;
  f18?: number | string;
  f100?: string;
  f102?: string;
}

// ==================== 市场识别 ====================

/**
 * 通过代码前缀识别 A 股市场
 * 返回 null 表示不支持（港股 / 美股 / 非法）
 */
export function detectDomesticSecurity(code: string): DomesticSecurityMeta | null {
  if (!/^\d{6}$/.test(code)) return null;
  const c = code;
  if (c.startsWith("920")) {
    return { secid: 0, prefix: "BJ", marketLabel: "北京", kind: "stock" };
  }
  if (c.startsWith("6")) {
    return { secid: 1, prefix: "SH", marketLabel: "上海", kind: "stock" };
  }
  if (c.startsWith("5")) {
    return { secid: 1, prefix: "SH", marketLabel: "上海", kind: "etf" };
  }
  if (c.startsWith("0") || c.startsWith("3")) {
    return { secid: 0, prefix: "SZ", marketLabel: "深圳", kind: "stock" };
  }
  if (c.startsWith("1")) {
    return { secid: 0, prefix: "SZ", marketLabel: "深圳", kind: "etf" };
  }
  if (c.startsWith("4") || c.startsWith("8")) {
    return { secid: 0, prefix: "BJ", marketLabel: "北京", kind: "stock" };
  }
  return null;
}

export function isAShareSuggestItem(item: EastmoneySuggestItem): boolean {
  const code = String(item.Code ?? "");
  const meta = detectDomesticSecurity(code);
  if (!meta || meta.kind !== "stock") return false;

  const securityTypeName = String(item.SecurityTypeName ?? "");
  const classify = String(item.Classify ?? "");
  return (
    securityTypeName === "沪A" ||
    securityTypeName === "深A" ||
    securityTypeName === "京A" ||
    securityTypeName === "科创板" ||
    classify === "AStock" ||
    classify === "23"
  );
}

export function detectAShareMarket(code: string): DomesticSecurityMeta | null {
  return detectDomesticSecurity(code);
}

export function isExchangeETFCode(code: string): boolean {
  return detectDomesticSecurity(code)?.kind === "etf";
}

/** 兼容旧 secid 计算（push2 secid 格式 = market.code） */
function buildSecid(code: string): DomesticSecurityMeta | null {
  return detectDomesticSecurity(code);
}

// ==================== 实时价 ====================

/**
 * 拉取单只股票实时报价
 * - 默认 30s TTL（交易时段用户期望看到价格跳动）
 * - 失败兜底返回 price=0 占位（不抛错），UI 显示 "—"
 * - opts.bypassCache=true：客户端轮询时强制重新打源站
 */
export async function getStockQuote(
  code: string,
  opts: { bypassCache?: boolean } = {},
): Promise<StockQuote | null> {
  const meta = buildSecid(code);
  if (!meta) return null;

  return cachedFetch(
    `stock-quote-${code}`,
    async () => {
      const empty: StockQuote = {
        code,
        name: code,
        price: 0,
        change: 0,
        changePercent: 0,
        open: 0,
        high: 0,
        low: 0,
        prevClose: 0,
        volume: 0,
        turnover: 0,
        timestamp: Date.now(),
        market: meta.prefix,
        marketLabel: meta.marketLabel,
      };

      try {
        // push2 stock/get 返回结构：{ rc, rt, svr, lt, full, dlmkts, data: {...} }
        const url =
          `https://push2.eastmoney.com/api/qt/stock/get?secid=${meta.secid}.${code}` +
          `&fields=f43,f44,f45,f46,f48,f60,f168,f169,f170,f50,f51,f52,f55,f56,f57,f58,f86,f292,f117`;
        const res = await fetchJson<{
          data?: Record<string, number | string>;
        }>(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
        const d = res.data;
        if (!d) return empty;

        // 字段映射（push2）：
        // f43: 当前价*100  f44: 最高*100  f45: 最低*100  f46: 今开*100
        // f60: 昨收*100   f48: 总成交量(手)  f168: 换手率%  f169: 涨跌额*100
        // f170: 涨跌幅%(*100)  f50: 量比(100x)  f51: 涨停价*100  f52: 跌停价*100
        // f55: 涨速   f56: 5分钟涨跌  f57: 代码  f58: 名称
        // f86: 数据时间戳(秒)  f292: 流通市值(元)  f117: 总市值(元)
        const div = (v: number | string | undefined): number => {
          const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
          return Number.isFinite(n) ? n / 100 : 0;
        };
        return {
          code,
          name: typeof d["f58"] === "string" && d["f58"] ? String(d["f58"]) : code,
          price: div(d["f43"]),
          change: div(d["f169"]),
          changePercent: div(d["f170"]),
          open: div(d["f46"]),
          high: div(d["f44"]),
          low: div(d["f45"]),
          prevClose: div(d["f60"]),
          volume: typeof d["f48"] === "number" ? d["f48"] : parseFloat(String(d["f48"] ?? 0)) || 0,
          turnover:
            typeof d["f292"] === "number" ? d["f292"] : parseFloat(String(d["f292"] ?? 0)) || 0,
          timestamp: typeof d["f86"] === "number" ? d["f86"] * 1000 : Date.now(),
          market: meta.prefix,
          marketLabel: meta.marketLabel,
        };
      } catch {
        return empty;
      }
    },
    30_000,
    opts,
  );
}

/**
 * 批量拉取多只股票实时报价（用于"全部持仓"列表）
 * - 东方财富 push2 支持 secid=1.600519,0.000001 一次拉多只
 * - 默认 60s TTL（持仓列表不需要太频繁刷新）
 * - 入参数组中非法 code 会被过滤
 */
export async function getStockQuotesBatch(
  codes: string[],
  opts: { bypassCache?: boolean } = {},
): Promise<Map<string, StockQuote>> {
  const result = new Map<string, StockQuote>();
  if (codes.length === 0) return result;

  // 过滤 + 去重 + 解析 secid
  const seen = new Set<string>();
  const validCodes: Array<{
    code: string;
    meta: { secid: number; prefix: AShareMarket; marketLabel: string };
  }> = [];
  for (const code of codes) {
    if (seen.has(code)) continue;
    seen.add(code);
    const meta = buildSecid(code);
    if (meta) validCodes.push({ code, meta });
  }
  if (validCodes.length === 0) return result;

  // 缓存键
  const cacheKey = `stock-quotes-batch-${validCodes.map((c) => c.code).join(",")}`;

  const cached = await cachedFetch<
    Record<string, Omit<StockQuote, "code" | "market" | "marketLabel">>
  >(
    cacheKey,
    async () => {
      const empty: Record<string, Omit<StockQuote, "code" | "market" | "marketLabel">> = {};
      const secidList = validCodes.map((v) => `${v.meta.secid}.${v.code}`).join(",");
      try {
        const url =
          `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secidList}` +
          `&fields=f12,f14,f2,f3,f4,f5,f6,f15,f16,f17,f18&fltt=2&invt=2`;
        const res = await fetchJson<{
          data?: { diff?: Array<Record<string, number | string>> };
        }>(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
        const rows = new Map<string, Record<string, number | string>>();
        for (const row of res.data?.diff ?? []) {
          const code = String(row["f12"] ?? "");
          if (code) rows.set(code, row);
        }
        const num = (v: number | string | undefined): number => {
          if (typeof v === "number") return Number.isFinite(v) ? v : 0;
          const n = parseFloat(String(v ?? ""));
          return Number.isFinite(n) ? n : 0;
        };
        for (const item of validCodes) {
          const d = rows.get(item.code);
          if (!d) {
            empty[item.code] = {
              name: item.code,
              price: 0,
              change: 0,
              changePercent: 0,
              open: 0,
              high: 0,
              low: 0,
              prevClose: 0,
              volume: 0,
              turnover: 0,
              timestamp: Date.now(),
            };
            continue;
          }
          empty[item.code] = {
            name: String(d["f14"] || item.code),
            price: num(d["f2"]),
            change: num(d["f4"]),
            changePercent: num(d["f3"]),
            open: num(d["f17"]),
            high: num(d["f15"]),
            low: num(d["f16"]),
            prevClose: num(d["f18"]),
            volume: num(d["f5"]),
            turnover: num(d["f6"]),
            timestamp: Date.now(),
          };
        }
        return empty;
      } catch {
        // 失败：所有股票都返回占位
        for (const item of validCodes) {
          empty[item.code] = {
            name: item.code,
            price: 0,
            change: 0,
            changePercent: 0,
            open: 0,
            high: 0,
            low: 0,
            prevClose: 0,
            volume: 0,
            turnover: 0,
            timestamp: Date.now(),
          };
        }
        return empty;
      }
    },
    60_000,
    opts,
  );

  for (const item of validCodes) {
    const d = cached[item.code];
    if (d) {
      result.set(item.code, {
        ...d,
        code: item.code,
        market: item.meta.prefix,
        marketLabel: item.meta.marketLabel,
      });
    }
  }
  return result;
}

// ==================== A 股搜索 / 快照 ====================

const A_SHARE_SEARCH_MAX_LIMIT = 100;
const A_SHARE_SEARCH_DEFAULT_LIMIT = 50;
const A_SHARE_CLIST_FS = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048";
const EASTMONEY_SUGGEST_TOKEN = "D43BF722C8E33BD7B4C877D8F1E0D7E2";
const A_SHARE_SNAPSHOT_FALLBACK_CODES = [
  "600519",
  "300750",
  "601318",
  "002594",
  "688981",
  "601899",
  "600036",
  "000001",
  "601166",
  "600276",
  "000858",
  "000333",
  "300760",
  "600900",
  "601088",
  "688111",
  "300059",
  "002475",
  "000651",
  "920527",
];

export async function searchAshareStocks(
  keyword: string,
  limit = A_SHARE_SEARCH_DEFAULT_LIMIT,
): Promise<StockSearchItem[]> {
  const query = keyword.trim();
  const safeLimit = clampSearchLimit(limit);
  if (!query) return getAshareMarketSnapshot(safeLimit);

  return cachedFetch(
    `a-share-search-${query}-${safeLimit}`,
    async () => {
      try {
        const suggestLimit = Math.min(A_SHARE_SEARCH_MAX_LIMIT, Math.max(safeLimit * 2, 20));
        const params = new URLSearchParams({
          input: query,
          type: "14",
          count: String(suggestLimit),
          token: EASTMONEY_SUGGEST_TOKEN,
        });
        const res = await fetchJson<{
          QuotationCodeTable?: { Data?: EastmoneySuggestItem[] };
        }>(`https://searchapi.eastmoney.com/api/suggest/get?${params.toString()}`, {
          headers: { Referer: "https://quote.eastmoney.com/" },
        });
        const rows = dedupeByCode((res.QuotationCodeTable?.Data ?? []).filter(isAShareSuggestItem));
        const quoteMap = await getStockQuotesBatch(rows.map((row) => String(row.Code ?? "")));
        const results = rows
          .map((row) => suggestItemToSearchItem(row, quoteMap.get(String(row.Code ?? ""))))
          .filter(Boolean)
          .slice(0, safeLimit) as StockSearchItem[];

        if (results.length > 0) return results;
      } catch {
        // 继续走代码直查兜底。
      }

      return /^\d{6}$/.test(query) ? await searchAshareByExactCode(query) : [];
    },
    60_000,
  );
}

export async function getAshareMarketSnapshot(
  limit = A_SHARE_SEARCH_DEFAULT_LIMIT,
): Promise<StockSearchItem[]> {
  const safeLimit = clampSearchLimit(limit);

  return cachedFetch(
    `a-share-market-snapshot-${safeLimit}`,
    async () => {
      try {
        const params = new URLSearchParams({
          pn: "1",
          pz: String(safeLimit),
          po: "1",
          np: "1",
          ut: "bd1d9ddb04089700cf9c27f6f7426281",
          fltt: "2",
          invt: "2",
          fid: "f3",
          fs: A_SHARE_CLIST_FS,
          fields: "f12,f14,f2,f3,f4,f5,f6,f15,f16,f17,f18,f100,f102",
        });
        const res = await fetchJson<{
          data?: { diff?: EastmoneyClistRow[] };
        }>(`https://push2.eastmoney.com/api/qt/clist/get?${params.toString()}`, {
          headers: { Referer: "https://quote.eastmoney.com/" },
        });
        return (res.data?.diff ?? [])
          .map(clistRowToSearchItem)
          .filter(Boolean)
          .slice(0, safeLimit) as StockSearchItem[];
      } catch {
        return getAshareFallbackSnapshot(safeLimit);
      }
    },
    60_000,
  );
}

function clampSearchLimit(limit: number): number {
  if (!Number.isFinite(limit)) return A_SHARE_SEARCH_DEFAULT_LIMIT;
  return Math.min(A_SHARE_SEARCH_MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function dedupeByCode<T extends { Code?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const code = String(item.Code ?? "");
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(item);
  }
  return result;
}

async function searchAshareByExactCode(code: string): Promise<StockSearchItem[]> {
  const meta = detectDomesticSecurity(code);
  if (!meta || meta.kind !== "stock") return [];

  const quote = await getStockQuote(code);
  if (!quote) return [];
  return [
    {
      ...quote,
      pinyin: "",
      industry: "",
      area: "",
    },
  ];
}

function suggestItemToSearchItem(
  item: EastmoneySuggestItem,
  quote: StockQuote | undefined,
): StockSearchItem | null {
  const code = String(item.Code ?? "");
  const meta = detectDomesticSecurity(code);
  if (!meta || meta.kind !== "stock") return null;
  const name = String(item.Name ?? quote?.name ?? code);

  return {
    code,
    name: quote?.name && quote.name !== code ? quote.name : name,
    price: quote?.price ?? 0,
    change: quote?.change ?? 0,
    changePercent: quote?.changePercent ?? 0,
    open: quote?.open ?? 0,
    high: quote?.high ?? 0,
    low: quote?.low ?? 0,
    prevClose: quote?.prevClose ?? 0,
    volume: quote?.volume ?? 0,
    turnover: quote?.turnover ?? 0,
    timestamp: quote?.timestamp ?? Date.now(),
    market: meta.prefix,
    marketLabel: marketLabelFromSuggest(item.SecurityTypeName, meta.marketLabel),
    pinyin: String(item.PinYin ?? ""),
    industry: "",
    area: "",
  };
}

function clistRowToSearchItem(row: EastmoneyClistRow): StockSearchItem | null {
  const code = String(row.f12 ?? "");
  const meta = detectDomesticSecurity(code);
  if (!meta || meta.kind !== "stock") return null;

  return {
    code,
    name: String(row.f14 || code),
    price: numberValue(row.f2),
    change: numberValue(row.f4),
    changePercent: numberValue(row.f3),
    open: numberValue(row.f17),
    high: numberValue(row.f15),
    low: numberValue(row.f16),
    prevClose: numberValue(row.f18),
    volume: numberValue(row.f5),
    turnover: numberValue(row.f6),
    timestamp: Date.now(),
    market: meta.prefix,
    marketLabel: meta.marketLabel,
    pinyin: "",
    industry: String(row.f100 ?? ""),
    area: String(row.f102 ?? ""),
  };
}

async function getAshareFallbackSnapshot(limit: number): Promise<StockSearchItem[]> {
  const quoteMap = await getStockQuotesBatch(A_SHARE_SNAPSHOT_FALLBACK_CODES);
  return A_SHARE_SNAPSHOT_FALLBACK_CODES.map((code) => quoteMap.get(code))
    .filter((quote): quote is StockQuote => Boolean(quote))
    .map((quote) => ({
      ...quote,
      pinyin: "",
      industry: "",
      area: "",
    }))
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, limit);
}

function marketLabelFromSuggest(label: string | undefined, fallback: string): string {
  if (label === "科创板") return "上海";
  if (label === "沪A") return "上海";
  if (label === "深A") return "深圳";
  if (label === "京A") return "北京";
  return fallback;
}

function numberValue(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

// ==================== K线 ====================

/**
 * 拉取 K线
 * - period: "1d"=日, "1w"=周, "1m"=月
 * - 默认 1h TTL（历史 K 线不太会变）
 * - 返回数据已按日期升序
 */
export async function getStockKLine(
  code: string,
  period: KLinePeriod = "1d",
  opts: { bypassCache?: boolean } = {},
): Promise<KLinePoint[]> {
  const meta = buildSecid(code);
  if (!meta) return [];

  const kltMap: Record<KLinePeriod, number> = { "1d": 101, "1w": 102, "1m": 103 };

  return cachedFetch(
    `stock-kline-${period}-${code}`,
    async () => {
      try {
        const url =
          `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${meta.secid}.${code}` +
          `&fields1=f1,f2,f3,f4,f5,f6` +
          `&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` +
          `&klt=${kltMap[period]}&fqt=1&end=20500000&lmt=${period === "1d" ? 800 : 500}`;
        const res = await fetchJson<{
          data?: { klines?: string[] };
        }>(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
        const klines = res.data?.klines ?? [];
        return klines.map(parseKLinePoint);
      } catch {
        return [];
      }
    },
    60 * 60 * 1000,
    opts,
  );
}

/** 一次性拉取日 / 周 / 月 K 线，供前端无闪烁切换周期 */
export async function getStockKLineMap(
  code: string,
  opts: { bypassCache?: boolean } = {},
): Promise<StockKLineMap> {
  const [daily, weekly, monthly] = await Promise.all([
    getStockKLine(code, "1d", opts),
    getStockKLine(code, "1w", opts),
    getStockKLine(code, "1m", opts),
  ]);

  return {
    "1d": daily,
    "1w": weekly,
    "1m": monthly,
  };
}

/** 解析 K 线一行："2026-07-01,10.50,10.80,10.30,10.60,123456,789012,5.71,2.91,0.85,2.13" */
export function parseKLinePoint(line: string): KLinePoint {
  const parts = line.split(",");
  return {
    date: parts[0] ?? "",
    open: parseFloat(parts[1]) || 0,
    close: parseFloat(parts[2]) || 0,
    high: parseFloat(parts[3]) || 0,
    low: parseFloat(parts[4]) || 0,
    volume: parseFloat(parts[5]) || 0,
    turnover: parseFloat(parts[6]) || 0,
    amplitude: parseFloat(parts[7]) || 0,
    changePercent: parseFloat(parts[8]) || 0,
    changeAmount: parseFloat(parts[9]) || 0,
  };
}

// ==================== 分时 ====================

/**
 * 拉取分时数据（最近 1 个交易日）
 * - 默认 1min TTL（盘中实时）
 * - 非交易时段：返回最近一个交易日的数据（前端需要自检）
 */
export async function getStockMinuteTrend(
  code: string,
  opts: { bypassCache?: boolean } = {},
): Promise<MinutePoint[]> {
  const meta = buildSecid(code);
  if (!meta) return [];

  return cachedFetch(
    `stock-minute-${code}`,
    async () => {
      try {
        const url =
          `https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=${meta.secid}.${code}` +
          `&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13` +
          `&fields2=f51,f52,f53,f54,f55,f56,f57,f58` +
          `&iscr=0&ndays=1`;
        const res = await fetchJson<{
          data?: { trends?: string[] };
        }>(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
        const trends = res.data?.trends ?? [];
        return trends.map(parseMinutePoint);
      } catch {
        return [];
      }
    },
    60_000,
    opts,
  );
}

/** 解析分时点："202607030930,10.50,10.45,123,456" */
export function parseMinutePoint(line: string): MinutePoint {
  const parts = line.split(",");
  const price = parseNumber(parts[2], parseNumber(parts[1], 0));
  const avgPrice = parseNumber(parts[parts.length - 1], price);
  return {
    time: parts[0] ?? "",
    price,
    avgPrice,
    volume: parseNumber(parts[5], 0),
    turnover: parseNumber(parts[6], 0),
  };
}

export function formatMinuteTimeLabel(time: string): string {
  const trimmed = time.trim();
  const match = trimmed.match(/(\d{1,2}):(\d{2})$/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  if (/^\d{12}$/.test(trimmed)) return `${trimmed.slice(8, 10)}:${trimmed.slice(10, 12)}`;
  if (/^\d{8}\d{4}$/.test(trimmed)) return `${trimmed.slice(8, 10)}:${trimmed.slice(10, 12)}`;
  return trimmed;
}

function parseNumber(value: string | undefined, fallback: number): number {
  const n = parseFloat(value ?? "");
  return Number.isFinite(n) ? n : fallback;
}

// ==================== 公司概况 ====================

/**
 * 拉取公司概况
 * - 1d TTL
 * - 失败返回 null
 */
export async function getStockCompanyInfo(code: string): Promise<StockCompanyInfo | null> {
  const meta = buildSecid(code);
  if (!meta) return null;

  return cachedFetch(
    `stock-info-${code}`,
    async () => {
      try {
        const url = `https://emweb.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code=${meta.prefix}${code}`;
        const res = await fetchJson<{
          jbzl?: Record<string, string>;
          zyjs?: string;
          gszl?: Record<string, string>;
        }>(url, { headers: { Referer: "https://emweb.eastmoney.com/" } });
        const jbzl = res.jbzl ?? {};
        return {
          name: jbzl["gsmc"] || code,
          industry: jbzl["ssgk"] || "—",
          listingDate: jbzl["ssrq"] || "—",
          totalShares: jbzl["zgb"] || "—",
          circulatingShares: jbzl["ltgb"] || "—",
          mainBusiness: res.zyjs || "—",
          profile: res.zyjs || "—",
        };
      } catch {
        return null;
      }
    },
    24 * 60 * 60 * 1000,
  );
}

// ==================== 财务指标 ====================

/**
 * 拉取主要财务指标
 * - 1d TTL
 * - 失败返回 null
 */
export async function getStockFinancials(code: string): Promise<StockFinancials | null> {
  const meta = buildSecid(code);
  if (!meta) return null;

  return cachedFetch(
    `stock-fin-${code}`,
    async () => {
      try {
        const url = `https://emweb.eastmoney.com/PC_HSF10/NewFinanceAnalysis/MainTargetAjax?code=${meta.prefix}${code}&type=0`;
        const res = await fetchJson<Array<Record<string, string | number | null>>>(url, {
          headers: { Referer: "https://emweb.eastmoney.com/" },
        });
        if (!Array.isArray(res) || res.length === 0) return null;
        const latest = res[0];
        return {
          eps: numOrNull(latest["mgjyxj"] ?? latest["eps"]),
          bvps: numOrNull(latest["mgjzc"]),
          roe: numOrNull(latest["jqjzcsyl"] ?? latest["roe"]),
          grossMargin: numOrNull(latest["xsmll"]),
          debtRatio: numOrNull(latest["zcfzl"]),
          pe: numOrNull(latest["sjl"]),
          pb: numOrNull(latest["sjll"]),
          ps: numOrNull(latest["syl"]),
          totalMarketCap: numOrNull(latest["zsz"]),
          circulatingMarketCap: numOrNull(latest["ltsz"]),
          reportDate: String(latest["reportdate"] ?? "—"),
        };
      } catch {
        return null;
      }
    },
    24 * 60 * 60 * 1000,
  );
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? (n as number) : null;
}

// ==================== 近期新闻 ====================

/**
 * 拉取近期新闻
 * - 10min TTL
 * - 失败返回空数组
 */
export async function getStockNews(code: string, limit = 10): Promise<StockNewsItem[]> {
  const meta = buildSecid(code);
  if (!meta) return [];

  return cachedFetch(
    `stock-news-${code}`,
    async () => {
      try {
        // 简化 param：只搜股票代码相关，搜索 cmsArticleWebOld
        const param = {
          uid: "",
          keyword: code,
          type: ["cmsArticleWebOld"],
          client: "web",
          clientType: "web",
          clientVersion: "curr",
          param: {
            cmsArticleWebOld: {
              searchScope: "default",
              sort: "default",
              pageIndex: 1,
              pageSize: limit,
              preTag: "",
              postTag: "",
            },
          },
        };
        const url =
          "https://search-api-web.eastmoney.com/search/jsonp?" +
          `param=${encodeURIComponent(JSON.stringify(param))}`;
        const res = await fetchJson<{
          result?: {
            cmsArticleWebOld?: Array<{
              title?: string;
              content?: string;
              mediaName?: string;
              showTime?: string;
              url?: string;
            }>;
          };
        }>(url, { headers: { Referer: "https://search-api-web.eastmoney.com/" } });
        const list = res.result?.cmsArticleWebOld ?? [];
        type NewsRaw = {
          title?: string;
          content?: string;
          mediaName?: string;
          showTime?: string;
          url?: string;
        };
        return list
          .filter((it: NewsRaw) => it.title)
          .map((it: NewsRaw) => ({
            title: stripHtml(String(it.title ?? "")),
            summary: stripHtml(String(it.content ?? "")).slice(0, 140),
            source: String(it.mediaName ?? "—"),
            publishTime: String(it.showTime ?? ""),
            url: String(it.url ?? "#"),
          }));
      } catch {
        return [];
      }
    },
    10 * 60 * 1000,
  );
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}
