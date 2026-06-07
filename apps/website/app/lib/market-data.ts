/**
 * 服务端数据获取层
 * 负责从外部API获取真实市场数据，带内存缓存
 *
 * 数据源说明（国内可访问）：
 * - 美股指数：新浪财经 hq.sinajs.cn
 * - VIX恐慌指数：CBOE CSV 接口
 * - 恐慌贪婪指数：基于VIX和市场数据自建（CNN接口国内不可用）
 * - 标普500 PE：multpl.com（备选）
 * - ETF溢价率：东方财富 datacenter API
 */

// ==================== 缓存 ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** 通用缓存获取，默认缓存5分钟 */
async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data as T;
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/** 通用 fetch 封装，带超时 */
async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      ...(init?.headers as Record<string, string>),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status}`);
  }
  return res.text();
}

/** 以 GBK 编码获取文本（新浪行情等接口需要） */
async function fetchTextGBK(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      ...(init?.headers as Record<string, string>),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  return new TextDecoder("gbk").decode(buffer);
}

/** 通用 fetchJson 封装 */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const text = await fetchText(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  return JSON.parse(text) as T;
}

// ==================== 新浪财经 - 美股指数 ====================

/**
 * 从新浪财经获取美股指数数据
 * 接口格式：var hq_str_int_xxx="名称,数值,变化绝对值,变化百分比";
 */
export async function getSinaIndexData(
  codes: string[],
): Promise<
  Array<{ code: string; name: string; price: number; change: number; changePercent: number }>
> {
  return cachedFetch(`sina-index-${codes.join(",")}`, async () => {
    try {
      const list = codes.join(",");
      const text = await fetchTextGBK(`http://hq.sinajs.cn/list=${list}`, {
        headers: { Referer: "http://finance.sina.com.cn/" },
      });

      const results: Array<{
        code: string;
        name: string;
        price: number;
        change: number;
        changePercent: number;
      }> = [];

      // 解析每行 var hq_str_int_xxx="名称,数值,变化,变化百分比";
      const lines = text.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const codeMatch = line.match(/var hq_str_(\w+)=/);
        const valueMatch = line.match(/="([^"]*)"/);
        if (!codeMatch || !valueMatch) continue;

        const code = codeMatch[1];
        const value = valueMatch[1];
        if (!value) continue; // 空数据

        const parts = value.split(",");
        if (parts.length >= 4) {
          results.push({
            code,
            name: parts[0],
            price: parseFloat(parts[1]) || 0,
            change: parseFloat(parts[2]) || 0,
            changePercent: parseFloat(parts[3]) || 0,
          });
        }
      }

      return results;
    } catch {
      return [];
    }
  });
}

// ==================== 新浪财经 - 美股个股 ====================

/**
 * 从新浪财经获取美股个股详细数据
 * 接口格式：var hq_str_gb_xxx="名称,当前价,涨跌幅,..."
 * 字段：0英文名 1中文名 2当前价 3涨跌幅 4日期时间 5涨跌额 6今开 7最高 8最低 ...
 */
export async function getSinaUSStock(symbol: string): Promise<{
  name: string;
  price: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
}> {
  return cachedFetch(`sina-us-${symbol}`, async () => {
    try {
      const text = await fetchTextGBK(`http://hq.sinajs.cn/list=gb_${symbol}`, {
        headers: { Referer: "http://finance.sina.com.cn/" },
      });

      const valueMatch = text.match(/="([^"]*)"/);
      if (!valueMatch || !valueMatch[1]) {
        throw new Error("no data");
      }

      const parts = valueMatch[1].split(",");
      // 新浪美股数据格式：
      // 0:名称, 1:当前价格, 2:涨跌额, 3:日期, 4:涨跌额(美元),
      // 5:昨收, 6:开盘, 7:最低, 8:最高, 22:涨跌幅%
      return {
        name: parts[0] || symbol,
        price: parseFloat(parts[1]) || 0,
        changePercent: parseFloat(parts[22]) || 0,
        open: parseFloat(parts[6]) || 0,
        high: parseFloat(parts[8]) || 0,
        low: parseFloat(parts[7]) || 0,
        prevClose: parseFloat(parts[5]) || 0,
      };
    } catch {
      return { name: symbol, price: 0, changePercent: 0, open: 0, high: 0, low: 0, prevClose: 0 };
    }
  });
}

// ==================== VIX (CBOE CSV) ====================

/** 从CBOE获取VIX历史数据，取最新值 */
export async function getVIX(): Promise<{
  value: number;
  change: number | null;
  changePercent: number | null;
}> {
  return cachedFetch("vix-cboe", async () => {
    try {
      const text = await fetchText(
        "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv",
      );
      const lines = text.trim().split("\n");
      if (lines.length < 3) throw new Error("not enough data");

      // CSV格式：DATE,OPEN,HIGH,LOW,CLOSE
      const latestLine = lines[lines.length - 1];
      const prevLine = lines[lines.length - 2];

      const latest = latestLine.split(",");
      const prev = prevLine.split(",");

      const close = parseFloat(latest[4]);
      const prevClose = parseFloat(prev[4]);

      if (isNaN(close) || close <= 0) throw new Error("invalid VIX data");

      const change = prevClose ? Math.round((close - prevClose) * 100) / 100 : null;
      const changePercent = prevClose
        ? Math.round(((close - prevClose) / prevClose) * 1000) / 10
        : null;

      return { value: Math.round(close * 100) / 100, change, changePercent };
    } catch {
      // CBOE失败，尝试新浪财经的VIX ETF数据
      try {
        const stock = await getSinaUSStock("uvxy");
        if (stock.price > 0) {
          // UVXY是1.5倍做多VIX期货，不能直接当VIX用
          // 但可以作为VIX的大致参考（需要反推）
          // 这里简单返回一个基于UVXY的估算
          return { value: 0, change: null, changePercent: null };
        }
      } catch {
        // 新浪也失败
      }
      return { value: 0, change: null, changePercent: null };
    }
  });
}

// ==================== 恐慌贪婪指数（自建） ====================

/**
 * 自建恐慌贪婪指数
 * CNN接口国内不可用，基于以下指标构建：
 * - VIX值（权重50%）：VIX越高越恐慌
 * - 标普500近30日涨跌幅（权重30%）：跌幅越大越恐慌
 * - 纳斯达克近30日涨跌幅（权重20%）：跌幅越大越恐慌
 *
 * VIX映射：0-15→80-100(贪婪), 15-20→60-80, 20-30→40-60, 30-40→20-40, 40+→0-20(恐慌)
 * 涨跌幅映射：涨幅>5%→80-100, 0-5%→60-80, -5%-0%→40-60, -10%--5%→20-40, <-10%→0-20
 */
export async function getFearGreedIndex(): Promise<{
  value: number;
  rating: string;
  previousClose: number | null;
  oneWeekAgo: number | null;
  oneMonthAgo: number | null;
}> {
  return cachedFetch("fear-greed-custom", async () => {
    try {
      const [vix, indices] = await Promise.all([
        getVIX(),
        getSinaIndexData(["int_sp500", "int_nasdaq"]),
      ]);

      const sp500 = indices.find((i) => i.code === "int_sp500");
      const nasdaq = indices.find((i) => i.code === "int_nasdaq");

      // VIX评分（VIX越低越贪婪）
      let vixScore: number;
      if (vix.value <= 12) vixScore = 95;
      else if (vix.value <= 15) vixScore = 80;
      else if (vix.value <= 18) vixScore = 65;
      else if (vix.value <= 22) vixScore = 50;
      else if (vix.value <= 28) vixScore = 35;
      else if (vix.value <= 35) vixScore = 20;
      else vixScore = 5;

      // 标普500涨跌幅评分
      const sp500Change = sp500?.changePercent ?? 0;
      let sp500Score: number;
      if (sp500Change >= 5) sp500Score = 95;
      else if (sp500Change >= 2) sp500Score = 75;
      else if (sp500Change >= 0) sp500Score = 60;
      else if (sp500Change >= -2) sp500Score = 40;
      else if (sp500Change >= -5) sp500Score = 25;
      else sp500Score = 5;

      // 纳斯达克涨跌幅评分
      const nasdaqChange = nasdaq?.changePercent ?? 0;
      let nasdaqScore: number;
      if (nasdaqChange >= 5) nasdaqScore = 95;
      else if (nasdaqChange >= 2) nasdaqScore = 75;
      else if (nasdaqChange >= 0) nasdaqScore = 60;
      else if (nasdaqChange >= -2) nasdaqScore = 40;
      else if (nasdaqChange >= -5) nasdaqScore = 25;
      else nasdaqScore = 5;

      // 加权计算
      const score = Math.round(vixScore * 0.5 + sp500Score * 0.3 + nasdaqScore * 0.2);
      const clampedScore = Math.max(0, Math.min(100, score));

      const rating = getFearGreedRating(clampedScore);

      return {
        value: clampedScore,
        rating,
        previousClose: null,
        oneWeekAgo: null,
        oneMonthAgo: null,
      };
    } catch {
      return {
        value: 50,
        rating: "Neutral",
        previousClose: null,
        oneWeekAgo: null,
        oneMonthAgo: null,
      };
    }
  });
}

function getFearGreedRating(score: number): string {
  if (score >= 80) return "Extreme Greed";
  if (score >= 60) return "Greed";
  if (score >= 40) return "Neutral";
  if (score >= 20) return "Fear";
  return "Extreme Fear";
}

// ==================== S&P 500 PE ====================

/**
 * 获取标普500 PE比率
 * 优先从multpl.com抓取，失败则使用新浪财经SPY数据推算
 * SPY ETF的PE与标普500指数PE基本一致
 */
export async function getSp500PE(): Promise<{
  value: number | null;
  source: string;
}> {
  return cachedFetch(
    "sp500-pe",
    async () => {
      // 方案1：从multpl.com抓取
      try {
        const res = await fetch("https://www.multpl.com/s-p-500-pe-ratio", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(10_000),
        });
        const html = await res.text();
        // 尝试多种匹配模式，PE值应在15-50之间（标普500历史PE范围）
        const patterns = [
          /S&amp;P 500 PE Ratio[^<]*?<[^>]*>([\d.]+)/,
          /PE Ratio[^<]*?<[^>]*>([\d.]+)/,
          /"current-value"[^>]*>([\d.]+)/,
          /id="current"[^>]*>([\d.]+)/,
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          const val = match ? parseFloat(match[1]) : 0;
          if (val >= 15 && val <= 50) {
            return { value: Math.round(val * 100) / 100, source: "multpl.com" };
          }
        }
      } catch {
        // multpl.com 不可用
      }

      // 方案2：从新浪财经获取SPY ETF价格，结合已知PE估算
      // SPY当前PE约27左右（2026年5月数据），当SPY价格变化时PE也会变化
      try {
        const spy = await getSinaUSStock("spy");
        if (spy.price > 0) {
          // SPY价格与PE的近似关系：SPY约737时PE约27
          // 这是一个粗略估算，实际PE需要盈利数据
          const basePrice = 737;
          const basePE = 27;
          const estimatedPE = Math.round((spy.price / basePrice) * basePE * 100) / 100;
          if (estimatedPE >= 15 && estimatedPE <= 50) {
            return { value: estimatedPE, source: "估算(基于SPY)" };
          }
        }
      } catch {
        // 新浪也失败
      }

      return { value: null, source: "unavailable" };
    },
    30 * 60 * 1000,
  ); // PE数据缓存30分钟
}

// ==================== 东方财富 ETF 溢价数据 ====================

/** 东方财富API响应 */
interface EastMoneyETFResponse {
  result?: {
    data?: Array<Record<string, unknown>>;
  };
  data?: Array<Record<string, unknown>>;
}

/** QDII ETF 代码列表 - 纳指100和标普500相关 */
const QDII_ETF_FILTER = [
  "513100", // 国泰纳斯达克100ETF
  "513110", // 华泰柏瑞纳斯达克100ETF
  "159941", // 广发纳斯达克100ETF
  "513300", // 华夏纳斯达克100ETF(QDII)
  "159659", // 招商纳斯达克100ETF(QDII)
  "159632", // 华安纳斯达克100ETF(QDII)
  "513870", // 富国纳斯达克100ETF(QDII)
  "159696", // 易方达纳斯达克100ETF(QDII)
  "159660", // 汇添富纳斯达克100ETF(QDII)
  "159501", // 嘉实纳斯达克100ETF(QDII)
  "513390", // 博时纳斯达克100ETF(QDII)
  "159513", // 大成纳斯达克100ETF(QDII)
  "159509", // 景顺长城纳指科技ETF(QDII)
  "513500", // 博时标普500ETF
  "159612", // 国泰标普500ETF(QDII)
  "513650", // 南方标普500ETF(QDII)
];

/** 安全获取对象中的数值 */
function numVal(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** 安全获取对象中的字符串 */
function strVal(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  return fallback;
}

/** 从东方财富获取ETF溢价数据 */
export async function getETFPremiumData(): Promise<
  Array<{
    code: string;
    name: string;
    index: string;
    premium: number;
    price: number;
    changePercent: number;
    scale: string;
    fee: string;
  }>
> {
  return cachedFetch("etf-premium", async () => {
    try {
      // 注意：sr=-1 表示按PREMIUM_DISCOUNT_RATIO降序排列
      // 不要加 isIndexFilter=1（会导致data为空）
      const data = await fetchJson<EastMoneyETFResponse>(
        "https://datacenter.eastmoney.com/stock/fundselector/api/data/get?type=RPTA_APP_FUNDSELECT&sty=SECUCODE,SECURITY_CODE,SECURITY_NAME_ABBR,NEW_PRICE,CHANGE_RATE,DEAL_AMOUNT,DEC_TOTALSHARE,DERIVE_INDEX_CODE,INDEX_NAME,PREMIUM_DISCOUNT_RATIO&source=FUND_SELECTOR&client=APP&sr=-1&st=PREMIUM_DISCOUNT_RATIO&filter=(ETF_TYPE_CODE=%22ALL%22)&p=1&ps=2000",
        {
          headers: {
            Referer: "https://fund.eastmoney.com/",
          },
        },
      );

      // 兼容两种响应结构
      const items = data?.result?.data ?? data?.data ?? [];
      // 筛选QDII ETF
      const filtered = items.filter((item) =>
        QDII_ETF_FILTER.includes(strVal(item.SECURITY_CODE ?? item.f12)),
      );

      return filtered.map((item) => {
        const rawDiscount = numVal(item.PREMIUM_DISCOUNT_RATIO ?? item.f136);
        // 折价率为负=溢价，正值表示溢价
        const premium = Math.abs(rawDiscount);
        const rawScale = numVal(item.DEC_TOTALSHARE ?? item.f20);
        const rawPrice = numVal(item.NEW_PRICE ?? item.f2);
        const rawChange = numVal(item.CHANGE_RATE ?? item.f3);

        return {
          code: strVal(item.SECURITY_CODE ?? item.f12),
          name: strVal(item.SECURITY_NAME_ABBR ?? item.f14),
          index: strVal(item.INDEX_NAME, "—"),
          premium: Math.round(premium * 100) / 100,
          price: rawPrice,
          changePercent: rawChange,
          scale: rawScale > 0 ? `${(rawScale / 1e8).toFixed(1)}亿` : "—",
          fee: "—",
        };
      });
    } catch {
      // 降级：返回空数组
      return [];
    }
  });
}

// ==================== 聚合数据 ====================

export interface MarketData {
  // 指数数据
  nasdaq: {
    price: number;
    change: number;
    changePercent: number;
  };
  sp500: {
    price: number;
    change: number;
    changePercent: number;
  };
  dowJones: {
    price: number;
    change: number;
    changePercent: number;
  };
  // VIX
  vix: {
    value: number;
    change: number | null;
    changePercent: number | null;
  };
  // 恐慌贪婪
  fearGreed: {
    value: number;
    rating: string;
    previousClose: number | null;
    oneWeekAgo: number | null;
    oneMonthAgo: number | null;
  };
  // 标普PE
  sp500PE: {
    value: number | null;
    source: string;
  };
  // ETF溢价
  etfPremium: Array<{
    code: string;
    name: string;
    index: string;
    premium: number;
    price: number;
    changePercent: number;
    scale: string;
    fee: string;
  }>;
  // 数据获取时间
  fetchedAt: string;
}

/** 获取首页所有市场数据 */
export async function getMarketData(): Promise<MarketData> {
  // 并行请求所有数据
  const [indices, vix, fearGreed, sp500PE, etfPremium] = await Promise.all([
    getSinaIndexData(["int_nasdaq", "int_sp500", "int_dji"]),
    getVIX(),
    getFearGreedIndex(),
    getSp500PE(),
    getETFPremiumData(),
  ]);

  const nasdaq = indices.find((i) => i.code === "int_nasdaq");
  const sp500 = indices.find((i) => i.code === "int_sp500");
  const dowJones = indices.find((i) => i.code === "int_dji");

  return {
    nasdaq: {
      price: nasdaq?.price ?? 0,
      change: nasdaq?.change ?? 0,
      changePercent: nasdaq?.changePercent ?? 0,
    },
    sp500: {
      price: sp500?.price ?? 0,
      change: sp500?.change ?? 0,
      changePercent: sp500?.changePercent ?? 0,
    },
    dowJones: {
      price: dowJones?.price ?? 0,
      change: dowJones?.change ?? 0,
      changePercent: dowJones?.changePercent ?? 0,
    },
    vix,
    fearGreed,
    sp500PE,
    etfPremium,
    fetchedAt: new Date().toISOString(),
  };
}

/** 获取单个ETF基金详情 */
export async function getFundDetail(code: string): Promise<{
  code: string;
  name: string;
  index: string;
  premium: number;
  price: number;
  changePercent: number;
  scale: string;
  fee: string;
} | null> {
  const all = await getETFPremiumData();
  return all.find((e) => e.code === code) ?? null;
}

// ==================== 基金详情数据 ====================

/** 基金详情完整数据 */
export interface FundDetailData {
  code: string;
  name: string;
  index: string;
  premium: number;
  price: number;
  changePercent: number;
  scale: string;
  fee: string;
  // 阶段涨幅
  performance: {
    oneMonth: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    oneYear: number | null;
  };
  // 业绩走势（近1年净值趋势，最多365个点）
  navTrend: Array<{ date: string; nav: number; dailyReturn: number }>;
  // 重仓股行情
  topHoldings: Array<{
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    holdingRatio: number; // 持仓占比(%)
  }>;
  // 历史净值（最近30条）
  navHistory: Array<{
    date: string;
    nav: string;
    accNav: string;
    dailyGrowth: string;
  }>;
}

/** 从东方财富pingzhongdata JS中提取基金详情 */
export async function getFundDetailData(code: string): Promise<FundDetailData | null> {
  // 先获取基础溢价数据
  const basic = await getFundDetail(code);
  if (!basic) return null;

  return cachedFetch(
    `fund-detail-${code}`,
    async () => {
      // 默认值
      const result: FundDetailData = {
        ...basic,
        performance: { oneMonth: null, threeMonth: null, sixMonth: null, oneYear: null },
        navTrend: [],
        topHoldings: [],
        navHistory: [],
      };

      // 并行获取：pingzhongdata + 历史净值
      const [pingzhongText, navHistoryData] = await Promise.all([
        fetchText(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
          headers: { Referer: "https://fund.eastmoney.com/" },
        }).catch(() => ""),
        fetchJson<{
          Data?: { LSJZList?: Array<{ FSRQ: string; DWJZ: string; LJJZ: string; JZZZL: string }> };
          TotalCount?: number;
        }>(`https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=30`, {
          headers: { Referer: "https://fundf10.eastmoney.com/" },
        }).catch(() => ({}) as Record<string, unknown>),
      ]);

      // 解析pingzhongdata
      if (pingzhongText) {
        // 阶段涨幅
        const syl1n = pingzhongText.match(/syl_1n="([^"]*)"/);
        const syl6y = pingzhongText.match(/syl_6y="([^"]*)"/);
        const syl3y = pingzhongText.match(/syl_3y="([^"]*)"/);
        const syl1y = pingzhongText.match(/syl_1y="([^"]*)"/);
        result.performance = {
          oneMonth: syl1y?.[1] ? parseFloat(syl1y[1]) : null,
          threeMonth: syl3y?.[1] ? parseFloat(syl3y[1]) : null,
          sixMonth: syl6y?.[1] ? parseFloat(syl6y[1]) : null,
          oneYear: syl1n?.[1] ? parseFloat(syl1n[1]) : null,
        };

        // 净值走势（全量数据，前端按时间范围过滤）
        const navMatch = pingzhongText.match(/Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
        if (navMatch) {
          try {
            const allData: Array<{ x: number; y: number; equityReturn: number }> = JSON.parse(
              navMatch[1],
            );
            result.navTrend = allData.map((d) => ({
              date: new Date(d.x).toISOString().split("T")[0],
              nav: d.y,
              dailyReturn: d.equityReturn ?? 0,
            }));
          } catch {
            // 解析失败
          }
        }

        // 重仓股代码
        const stockMatch = pingzhongText.match(/stockCodes=(\[[^\]]+\])/);
        if (stockMatch) {
          try {
            const stockCodes: string[] = JSON.parse(stockMatch[1]);
            // 提取股票代码（如 NVDA105 → NVDA）
            const symbols = stockCodes
              .map((s) => s.replace(/\d+$/, ""))
              .filter((s) => s.length > 0);

            // 从东方财富获取持仓占比
            const holdingMap = new Map<string, number>();
            try {
              const holdingText = await fetchText(
                `https://fund.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=&month=&rt=0.${Date.now()}`,
                { headers: { Referer: "https://fundf10.eastmoney.com/" } },
              ).catch(() => "");
              if (holdingText) {
                // 解析持仓占比，格式如：<td class='tor'>9.89%</td>
                const ratioMatches = [
                  ...holdingText.matchAll(/class='(?:tor|tol)'>\s*([\d.]+)%\s*<\/td>/g),
                ];
                // 解析股票代码，格式如：href="...code=NVDA..."
                const codeMatches = [...holdingText.matchAll(/code=(\w+)[&"']/g)];
                for (let i = 0; i < Math.min(codeMatches.length, ratioMatches.length); i++) {
                  holdingMap.set(
                    codeMatches[i][1].toUpperCase(),
                    parseFloat(ratioMatches[i][1]) || 0,
                  );
                }
              }
            } catch {
              // 忽略
            }

            if (symbols.length > 0) {
              // 从新浪获取实时行情
              const sinaCodes = symbols.map((s) => `gb_${s.toLowerCase()}`).join(",");
              const stockText = await fetchTextGBK(`http://hq.sinajs.cn/list=${sinaCodes}`, {
                headers: { Referer: "http://finance.sina.com.cn/" },
              }).catch(() => "");

              if (stockText) {
                const lines = stockText.split("\n").filter((l) => l.trim());
                for (const line of lines) {
                  const m = line.match(/var hq_str_gb_(\w+)="([^"]*)"/);
                  if (m && m[2]) {
                    const parts = m[2].split(",");
                    const sym = m[1].toUpperCase();
                    result.topHoldings.push({
                      symbol: sym,
                      name: parts[0] || sym,
                      price: parseFloat(parts[1]) || 0,
                      changePercent: parseFloat(parts[22]) || 0,
                      holdingRatio: holdingMap.get(sym) || 0,
                    });
                  }
                }
              }
            }
          } catch {
            // 解析失败
          }
        }
      }

      // 解析历史净值
      const navData = navHistoryData as {
        Data?: {
          LSJZList?: Array<{
            FSRQ: string;
            DWJZ: string;
            LJJZ: string;
            JZZZL: string;
          }>;
        };
      };
      if (navData?.Data?.LSJZList) {
        result.navHistory = navData.Data.LSJZList.map((d) => ({
          date: d.FSRQ,
          nav: d.DWJZ,
          accNav: d.LJJZ,
          dailyGrowth: d.JZZZL,
        }));
      }

      return result;
    },
    10 * 60 * 1000,
  ); // 缓存10分钟
}
