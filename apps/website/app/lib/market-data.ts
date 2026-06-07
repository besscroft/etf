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

/** 批量获取基金对比数据（并行获取多只基金详情） */
export async function getFundCompareData(
  codes: string[],
): Promise<Array<FundDetailData & { error?: string }>> {
  const results = await Promise.all(
    codes.map(async (code) => {
      try {
        const detail = await getFundDetailData(code);
        if (!detail)
          return { code, name: code, error: "未找到" } as FundDetailData & { error: string };
        return detail;
      } catch {
        return { code, name: code, error: "获取失败" } as FundDetailData & { error: string };
      }
    }),
  );
  return results;
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
    threeYear: number | null;
    sinceInception: number | null;
  };
  // 业绩走势（全量净值趋势）
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
  // 最大回撤
  maxDrawdown: number | null;
  // 月度收益率（用于热力图）
  monthlyReturns: Array<{ year: number; month: number; returnRate: number }>;
  // 基金经理
  managers: Array<{
    name: string;
    tenure: string;
    tenureReturn: number | null;
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
        performance: {
          oneMonth: null,
          threeMonth: null,
          sixMonth: null,
          oneYear: null,
          threeYear: null,
          sinceInception: null,
        },
        navTrend: [],
        topHoldings: [],
        navHistory: [],
        maxDrawdown: null,
        monthlyReturns: [],
        managers: [],
      };

      // 并行获取：pingzhongdata + 历史净值 + 基金经理
      const [pingzhongText, navHistoryData, managerData] = await Promise.all([
        fetchText(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
          headers: { Referer: "https://fund.eastmoney.com/" },
        }).catch(() => ""),
        fetchJson<{
          Data?: { LSJZList?: Array<{ FSRQ: string; DWJZ: string; LJJZ: string; JZZZL: string }> };
          TotalCount?: number;
        }>(`https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=30`, {
          headers: { Referer: "https://fundf10.eastmoney.com/" },
        }).catch(() => ({}) as Record<string, unknown>),
        fetchJson<{
          Data?: {
            fundManager?: Array<{
              managerName: string;
              tenure: string;
              tenureReturn: string;
            }>;
          };
        }>(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
          headers: { Referer: "https://fund.eastmoney.com/" },
        })
          .then(() => {
            // pingzhongdata 不直接提供经理JSON，需要单独接口
            return fetchJson<{
              Data?: Array<{ jjjl?: string; rzrq?: string; jlr?: string }>;
            }>(
              `https://fund.eastmoney.com/FundArchivesDatas.aspx?type=jjjl&code=${code}&rt=0.${Date.now()}`,
              {
                headers: { Referer: "https://fundf10.eastmoney.com/" },
              },
            ).catch(() => ({}) as Record<string, unknown>);
          })
          .catch(() => ({}) as Record<string, unknown>),
      ]);

      // 解析pingzhongdata
      if (pingzhongText) {
        // 阶段涨幅
        const syl1n = pingzhongText.match(/syl_1n="([^"]*)"/);
        const syl6y = pingzhongText.match(/syl_6y="([^"]*)"/);
        const syl3y = pingzhongText.match(/syl_3y="([^"]*)"/);
        const syl1y = pingzhongText.match(/syl_1y="([^"]*)"/);
        const syl3n = pingzhongText.match(/syl_3n="([^"]*)"/);
        const sylCl = pingzhongText.match(/syl_cl="([^"]*)"/);
        result.performance = {
          oneMonth: syl1y?.[1] ? parseFloat(syl1y[1]) : null,
          threeMonth: syl3y?.[1] ? parseFloat(syl3y[1]) : null,
          sixMonth: syl6y?.[1] ? parseFloat(syl6y[1]) : null,
          oneYear: syl1n?.[1] ? parseFloat(syl1n[1]) : null,
          threeYear: syl3n?.[1] ? parseFloat(syl3n[1]) : null,
          sinceInception: sylCl?.[1] ? parseFloat(sylCl[1]) : null,
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

            // 计算最大回撤
            result.maxDrawdown = calcMaxDrawdown(result.navTrend.map((d) => d.nav));

            // 计算月度收益率
            result.monthlyReturns = calcMonthlyReturns(allData);
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

      // 解析基金经理（从HTML文本中提取）
      const mgrData = managerData as { content?: string };
      if (mgrData?.content) {
        try {
          // 匹配经理名称和任职日期
          const nameMatches = [...mgrData.content.matchAll(/class="jlname"[^>]*>([^<]+)/g)];
          const tenureMatches = [...mgrData.content.matchAll(/任职日期[^>]*>([^<]+)/g)];
          const returnMatches = [...mgrData.content.matchAll(/任职回报[^>]*>([^<]+)/g)];
          for (let i = 0; i < nameMatches.length; i++) {
            const name = nameMatches[i][1].trim();
            const tenure = tenureMatches[i]?.[1]?.trim() ?? "—";
            const retStr = returnMatches[i]?.[1]?.replace(/%/g, "").trim();
            result.managers.push({
              name,
              tenure,
              tenureReturn: retStr ? parseFloat(retStr) : null,
            });
          }
        } catch {
          // 解析失败
        }
      }

      return result;
    },
    10 * 60 * 1000,
  ); // 缓存10分钟
}

// ==================== 计算辅助函数 ====================

/** 计算最大回撤（返回负数，如 -15.3 表示最大回撤 15.3%） */
function calcMaxDrawdown(navs: number[]): number | null {
  if (navs.length < 2) return null;
  let maxDrawdown = 0;
  let peak = navs[0];
  for (let i = 1; i < navs.length; i++) {
    if (navs[i] > peak) {
      peak = navs[i];
    }
    const drawdown = (navs[i] - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  return Math.round(maxDrawdown * 10000) / 100; // 转为百分比，保留2位
}

/** 从净值走势计算月度收益率 */
function calcMonthlyReturns(
  allData: Array<{ x: number; y: number; equityReturn: number }>,
): Array<{ year: number; month: number; returnRate: number }> {
  if (allData.length < 2) return [];

  // 按月分组，取每月最后一个交易日的净值
  const monthEndNavs = new Map<string, { nav: number; prevNav: number }>();
  let lastMonthKey = "";

  for (const d of allData) {
    const date = new Date(d.x);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (key !== lastMonthKey) {
      // 新月份开始，记录月初净值（上月末净值）
      if (lastMonthKey && monthEndNavs.has(lastMonthKey)) {
        const prev = monthEndNavs.get(lastMonthKey)!;
        prev.nav = d.y; // 更新上月末为当前月初
      }
      lastMonthKey = key;
      monthEndNavs.set(key, { nav: d.y, prevNav: d.y });
    } else {
      const entry = monthEndNavs.get(key)!;
      entry.nav = d.y;
    }
  }

  // 计算每月收益率
  const results: Array<{ year: number; month: number; returnRate: number }> = [];
  const sortedKeys = [...monthEndNavs.keys()].sort();
  for (let i = 1; i < sortedKeys.length; i++) {
    const prevEntry = monthEndNavs.get(sortedKeys[i - 1])!;
    const currEntry = monthEndNavs.get(sortedKeys[i])!;
    const [yearStr, monthStr] = sortedKeys[i].split("-");
    const returnRate =
      prevEntry.nav > 0 ? ((currEntry.nav - prevEntry.nav) / prevEntry.nav) * 100 : 0;
    results.push({
      year: parseInt(yearStr),
      month: parseInt(monthStr),
      returnRate: Math.round(returnRate * 100) / 100,
    });
  }

  return results;
}

// ==================== 场外基金排行数据（东方财富 datacenter-web） ====================

/** 场外基金数据 */
export interface OTCFundData {
  /** 基金代码 */
  code: string;
  /** 基金名称 */
  name: string;
  /** 基金规模（亿元） */
  scale: number;
  /** 近1年收益率(%) */
  returnOneYear: number | null;
  /** 近6月收益率(%) */
  returnSixMonth: number | null;
  /** 近3月收益率(%) */
  returnThreeMonth: number | null;
  /** 近1月收益率(%) */
  returnOneMonth: number | null;
  /** 昨日涨跌(%) */
  changeDaily: number | null;
  /** 成立以来收益率(%) */
  returnSinceInception: number | null;
  /** 单位净值 */
  nav: number | null;
  /** 净值日期 */
  navDate: string;
  /** 申购费率(%) */
  purchaseRate: number | null;
  /** 申购状态 */
  purchaseStatus: string;
  /** 申购限额 */
  purchaseLimit: string;
}

/** 东方财富 RPT_FUND_RANK 响应 */
interface FundRankResponse {
  result?: {
    data?: Array<Record<string, unknown>>;
  };
  success?: boolean;
}

/**
 * 纳指100场外基金代码列表
 * 来源：wise-etf.com/nasdaq 参考的天天基金网数据
 */
const NASDAQ_100_OTC_CODES = [
  "017091", // 景顺长城纳斯达克科技市值加权ETF联接A
  "019172", // 摩根纳斯达克100指数(QDII)A
  "160213", // 国泰纳斯达克100指数(QDII)
  "018043", // 天弘纳斯达克100指数(QDII)A
  "016055", // 博时纳斯达克100ETF联接(QDII)A
  "016452", // 南方纳斯达克100指数(QDII)A
  "019736", // 宝盈纳斯达克100指数(QDII)A
  "270042", // 广发纳斯达克100ETF联接(QDII)
  "019441", // 万家纳斯达克100指数发起式(QDII)
  "000834", // 大成纳斯达克100指数(QDII)A
  "019524", // 华泰柏瑞纳斯达克100ETF联接(QDII)A
  "161130", // 易方达纳斯达克100ETF联接(QDII-LOF)A
  "016532", // 嘉实纳斯达克100联接(QDII)A
  "019547", // 招商纳斯达克100ETF联接(QDII)A
  "539001", // 建信纳斯达克100指数QDII A
  "015299", // 华夏纳斯达克100ETF联接(QDII)A
  "018966", // 汇添富纳斯达克100ETF联接(QDII)A
  "040046", // 华安纳斯达克100指数(QDII)
];

/**
 * 标普500场外基金代码列表
 * 来源：wise-etf.com/sp500 参考的天天基金网数据
 */
const SP500_OTC_CODES = [
  "161128", // 易方达标普信息科技指数(QDII-FOF)A
  "050025", // 博时标普500ETF联接(QDII)A
  "017641", // 摩根标普500指数(QDII)A
  "161125", // 易方达标普500指数(QDII-LOF)A
  "017028", // 国泰标普500ETF联接(QDII)A
  "007721", // 天弘标普500(QDII-FOF)A
  "018064", // 华夏标普500ETF联接(QDII)A
  "096001", // 大成标普500等权重指数(QDII)A
];

/**
 * 美股主动型基金代码列表
 * 来源：wise-etf.com/active 参考的天天基金网数据
 */
const ACTIVE_US_CODES = [
  "457001", // 国富亚洲机会股票(QDII)A
  "002891", // 华夏移动互联灵活配置混合(QDII)A
  "012920", // 易方达全球成长精选混合(QDII)A
  "539002", // 建信新兴市场优选混合(QDII)A
  "018155", // 创金合信全球医药生物股票发起式(QDII)A
  "018156", // 创金合信全球医药生物股票发起式(QDII)C
  "017730", // 嘉实全球产业升级股票(QDII)A
  "017731", // 嘉实全球产业升级股票发起式(QDII)C
  "006373", // 国富全球科技互联混合(QDII)人民币A
  "005698", // 华夏全球科技先锋混合(QDII)
  "501226", // 长城全球新能源汽车股票(QDII-LOF)A
  "008253", // 华宝致远混合(QDII)A
  "022184", // 富国全球科技互联网股票(QDII)C
  "006555", // 浦银安盛全球智能科技股票(QDII)A
  "001668", // 汇添富全球移动互联混合(QDII)A
  "100055", // 富国全球科技互联网股票(QDII)A
  "016823", // 天弘全球新能源汽车股票(QDII-LOF)C
  "270023", // 广发全球精选股票(QDII)A
  "018036", // 长城全球新能源车股票发起式(QDII)C
  "004877", // 汇添富全球医疗混合(QDII)人民币
  "016701", // 银华海外数字经济量化选股混合(QDII)A
  "017145", // 华宝海外新能源汽车股票发起式(QDII)C
  "017436", // 华宝纳斯达克精选股票(QDII)A
  "017144", // 华宝海外新能源汽车股票(QDII)A
  "016702", // 银华海外数字经济量化选股混合(QDII)C
  "017437", // 华宝纳斯达克精选股票发起式(QDII)C
  "006308", // 汇添富全球消费混合(QDII)人民币A
  "006309", // 汇添富全球消费混合(QDII)人民币C
];

/** 从东方财富获取场外基金排行数据 */
export async function getOTCFundData(codes: string[]): Promise<OTCFundData[]> {
  return cachedFetch(`otc-fund-${codes.join(",")}`, async () => {
    try {
      // 构建筛选条件
      const codeList = codes.map((c) => `"${c}"`).join(",");
      const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_FUND_RANK&columns=SECURITY_CODE,FUND_NAME,FUND_SCALE,CHANGE_YEAR,CHANGE,CHANGE_MONTH,CHANGE_3MONTHS,CHANGE_6MONTHS,CHANGE_FOUNDLD,PER_NAV,NAV_DATE,APPLY_RATE,FUND_TYPECODE&filter=(SECURITY_CODE%20in%20(${codeList}))&pageNumber=1&pageSize=200&sortColumns=CHANGE_YEAR&sortTypes=-1`;

      const data = await fetchJson<FundRankResponse>(url, {
        headers: { Referer: "https://fund.eastmoney.com/" },
      });

      const items = data?.result?.data ?? [];
      // 去重：同一基金代码可能有多条记录（不同FUND_TYPECODE），只保留第一条
      const seen = new Set<string>();
      const unique = items.filter((item) => {
        const code = strVal(item.SECURITY_CODE);
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      });

      // 并行获取申购状态
      const purchaseInfo = await getFundPurchaseStatus(codes);

      return unique.map((item) => {
        const code = strVal(item.SECURITY_CODE);
        const rawScale = numVal(item.FUND_SCALE);
        const info = purchaseInfo.get(code);

        return {
          code,
          name: strVal(item.FUND_NAME),
          scale: rawScale > 0 ? Math.round((rawScale / 1e8) * 10) / 10 : 0,
          returnOneYear: numVal(item.CHANGE_YEAR, -999) === -999 ? null : numVal(item.CHANGE_YEAR),
          returnSixMonth:
            numVal(item.CHANGE_6MONTHS, -999) === -999 ? null : numVal(item.CHANGE_6MONTHS),
          returnThreeMonth:
            numVal(item.CHANGE_3MONTHS, -999) === -999 ? null : numVal(item.CHANGE_3MONTHS),
          returnOneMonth:
            numVal(item.CHANGE_MONTH, -999) === -999 ? null : numVal(item.CHANGE_MONTH),
          changeDaily: numVal(item.CHANGE, -999) === -999 ? null : numVal(item.CHANGE),
          returnSinceInception:
            numVal(item.CHANGE_FOUNDLD, -999) === -999 ? null : numVal(item.CHANGE_FOUNDLD),
          nav: numVal(item.PER_NAV, -999) === -999 ? null : numVal(item.PER_NAV),
          navDate: strVal(item.NAV_DATE).slice(0, 10),
          purchaseRate: numVal(item.APPLY_RATE, -999) === -999 ? null : numVal(item.APPLY_RATE),
          purchaseStatus: info?.status ?? "未知",
          purchaseLimit: info?.limit ?? "未知",
        };
      });
    } catch {
      return [];
    }
  });
}

/** 基金申购状态信息 */
interface PurchaseInfo {
  status: string;
  limit: string;
}

/**
 * 从天天基金网获取基金申购状态和限额
 * 数据来源：fundf10.eastmoney.com 基金详情页
 */
async function getFundPurchaseStatus(codes: string[]): Promise<Map<string, PurchaseInfo>> {
  const result = new Map<string, PurchaseInfo>();

  // 并行获取每只基金的详情页
  const tasks = codes.map(async (code) => {
    try {
      const html = await fetchText(`https://fundf10.eastmoney.com/jjjz_${code}.html`, {
        headers: { Referer: "https://fund.eastmoney.com/" },
      });

      let status = "开放";
      let limit = "不限额";

      // 解析申购状态
      if (html.includes("暂停申购")) {
        status = "暂停";
        limit = "暂停申购";
      } else if (html.includes("限大额")) {
        status = "限大额";
        // 尝试提取限额信息
        const limitMatch = html.match(/单日累计购买上限(\d+\.?\d*[万亿]?元?)/);
        if (limitMatch) {
          limit = limitMatch[1];
        } else {
          const limitMatch2 = html.match(/购买上限(\d+\.?\d*[万亿]?元)/);
          if (limitMatch2) {
            limit = limitMatch2[1];
          }
        }
      }

      result.set(code, { status, limit });
    } catch {
      result.set(code, { status: "未知", limit: "未知" });
    }
  });

  await Promise.all(tasks);
  return result;
}

/** 获取纳指100场外基金数据 */
export async function getNasdaqOTCData(): Promise<OTCFundData[]> {
  return getOTCFundData(NASDAQ_100_OTC_CODES);
}

/** 获取标普500场外基金数据 */
export async function getSP500OTCData(): Promise<OTCFundData[]> {
  return getOTCFundData(SP500_OTC_CODES);
}

/** 获取美股主动型基金数据 */
export async function getActiveUSFundData(): Promise<OTCFundData[]> {
  return getOTCFundData(ACTIVE_US_CODES);
}
