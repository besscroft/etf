import { getPublicOTCFundData, type OTCClassifiedFundData } from "~/lib/market-data";
import { getStockQuotesBatch, type StockQuote } from "~/lib/stock-data";

export type DomesticQuoteKind = "stock" | "etf";

export interface DomesticQuoteSeed {
  code: string;
  name: string;
  kind: DomesticQuoteKind;
  theme: string;
}

export interface DomesticQuoteItem extends StockQuote {
  displayName: string;
  kind: DomesticQuoteKind;
  theme: string;
}

export interface DomesticHomeData {
  stockHighlights: DomesticQuoteItem[];
  etfHighlights: DomesticQuoteItem[];
  otcHighlights: OTCClassifiedFundData[];
  fetchedAt: string;
}

export const A_SHARE_HIGHLIGHTS: DomesticQuoteSeed[] = [
  { code: "600519", name: "贵州茅台", kind: "stock", theme: "白酒龙头" },
  { code: "300750", name: "宁德时代", kind: "stock", theme: "新能源" },
  { code: "601318", name: "中国平安", kind: "stock", theme: "金融权重" },
  { code: "002594", name: "比亚迪", kind: "stock", theme: "汽车产业链" },
  { code: "688981", name: "中芯国际", kind: "stock", theme: "半导体" },
  { code: "601899", name: "紫金矿业", kind: "stock", theme: "资源品" },
];

export const ETF_HIGHLIGHTS: DomesticQuoteSeed[] = [
  { code: "510300", name: "沪深300ETF", kind: "etf", theme: "宽基核心" },
  { code: "510050", name: "上证50ETF", kind: "etf", theme: "大盘蓝筹" },
  { code: "510500", name: "中证500ETF", kind: "etf", theme: "中盘成长" },
  { code: "512100", name: "中证1000ETF", kind: "etf", theme: "小盘分散" },
  { code: "159915", name: "创业板ETF", kind: "etf", theme: "成长风格" },
  { code: "588000", name: "科创50ETF", kind: "etf", theme: "硬科技" },
  { code: "515080", name: "中证红利ETF", kind: "etf", theme: "红利低波" },
  { code: "512880", name: "证券ETF", kind: "etf", theme: "券商弹性" },
  { code: "512760", name: "芯片ETF", kind: "etf", theme: "半导体" },
  { code: "515700", name: "新能源车ETF", kind: "etf", theme: "新能源车" },
];

export async function getDomesticQuotes(seeds: DomesticQuoteSeed[]): Promise<DomesticQuoteItem[]> {
  const quoteMap = await getStockQuotesBatch(seeds.map((seed) => seed.code));

  return seeds.map((seed) => {
    const quote = quoteMap.get(seed.code);
    const fallbackMarket = seed.code.startsWith("6") || seed.code.startsWith("5") ? "SH" : "SZ";
    const base: StockQuote = quote ?? {
      code: seed.code,
      name: seed.name,
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
      market: fallbackMarket,
      marketLabel: fallbackMarket === "SH" ? "上海" : "深圳",
    };

    return {
      ...base,
      displayName: seed.name,
      kind: seed.kind,
      theme: seed.theme,
    };
  });
}

export async function getDomesticHomeData(): Promise<DomesticHomeData> {
  const [stockHighlights, etfHighlights, otcFunds] = await Promise.all([
    getDomesticQuotes(A_SHARE_HIGHLIGHTS.slice(0, 4)),
    getDomesticQuotes(ETF_HIGHLIGHTS.slice(0, 6)),
    getPublicOTCFundData(),
  ]);

  const otcHighlights = otcFunds
    .filter((fund) => fund.returnOneYear !== null || fund.scale > 0)
    .sort((a, b) => {
      const ar = a.returnOneYear ?? -999;
      const br = b.returnOneYear ?? -999;
      if (br !== ar) return br - ar;
      return b.scale - a.scale;
    })
    .slice(0, 6);

  return {
    stockHighlights,
    etfHighlights,
    otcHighlights,
    fetchedAt: new Date().toISOString(),
  };
}
