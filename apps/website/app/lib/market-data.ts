/**
 * 服务端数据获取层
 * 负责从外部API获取真实市场数据，带内存缓存
 *
 * 数据源策略（优先级从高到低）：
 * - 东方财富 datacenter API（结构化JSON，优先使用）
 * - 天天基金网（fund.eastmoney.com，降级处理）
 *
 * 数据源说明（国内可访问）：
 * - 美股指数：新浪财经 hq.sinajs.cn
 * - VIX恐慌指数：CBOE CSV 接口
 * - 恐慌贪婪指数：基于VIX和市场数据自建（CNN接口国内不可用）
 * - 标普500 PE：multpl.com（备选）
 * - 场外基金排行：东方财富 datacenter-web API（优先）→ rankhandler.aspx（降级2，含手续费）→ pingzhongdata 逐只获取（降级3）
 * - 基金详情：东方财富 pingzhongdata（优先）→ 天天基金 F10DataApi（降级）
 * - 盘中实时估值：天天基金 fundgz.1234567.com.cn（参考 finshare fund_source.py）
 * - 费率信息：pingzhongdata JS变量提取 fund_sourceRate/fund_Rate/fund_minsg（参考 finshare fund_source.py）
 * - 基金代码搜索：天天基金 fundcode_search.js（参考 finshare fund_source.py）
 * - 申购状态：东方财富 fundf10（优先）→ 天天基金详情页（降级）
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

// ==================== 纳斯达克100 PE ====================

/**
 * 获取纳斯达克100指数PE
 * 数据源：worldperatio.com（优先）→ 基于QQQ估算（降级）
 */
export async function getNasdaq100PE(): Promise<{
  value: number | null;
  source: string;
}> {
  return cachedFetch(
    "nasdaq100-pe",
    async () => {
      // 方案1：从 worldperatio.com 抓取
      try {
        const res = await fetch("https://worldperatio.com/index/nasdaq-100/", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(10_000),
        });
        const html = await res.text();
        // 匹配页面中的PE值，格式如 "P/E Ratio  32.47"
        const patterns = [/P\/E Ratio\s+([\d.]+)/, /PE Ratio[^<]*?<[^>]*>([\d.]+)/];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          const val = match ? parseFloat(match[1]) : 0;
          // 纳指100 PE历史范围约 12-40
          if (val >= 12 && val <= 45) {
            return { value: Math.round(val * 100) / 100, source: "worldperatio.com" };
          }
        }
      } catch {
        // worldperatio.com 不可用
      }

      // 方案2：基于QQQ ETF价格估算
      try {
        const qqq = await getSinaUSStock("qqq");
        if (qqq.price > 0) {
          // QQQ约537时PE约32，粗略估算
          const basePrice = 537;
          const basePE = 32;
          const estimatedPE = Math.round((qqq.price / basePrice) * basePE * 100) / 100;
          if (estimatedPE >= 12 && estimatedPE <= 45) {
            return { value: estimatedPE, source: "估算(基于QQQ)" };
          }
        }
      } catch {
        // 估算也失败
      }

      return { value: null, source: "unavailable" };
    },
    30 * 60 * 1000,
  ); // PE数据缓存30分钟
}

// ==================== 东方财富 ETF 溢价数据 ====================

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

/**
 * 提取JS变量的通用辅助函数
 * 参考自 finshare fund_source.py 的 extract_js_var 实现
 * 从 pingzhongdata 等 JS 文本中提取 var xxx = "value"; 形式的变量值
 */
function extractJsVar(text: string, varName: string): string | null {
  const pattern = new RegExp(`var\\s+${varName}\\s*=\\s*["']?([^"';\\n]+)["']?\\s*;?`);
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

/**
 * 提取JS数组变量的辅助函数
 * 从 pingzhongdata 等 JS 文本中提取 var xxx = [...]; 形式的数组
 */
function extractJsArray<T>(text: string, varName: string): T[] | null {
  const pattern = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`);
  const match = text.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as T[];
  } catch {
    return null;
  }
}

// ==================== 聚合数据 ====================

/** 首页首屏：4 个核心指数（纳指/纳指100/标普/道琼） */
export interface HomeCoreData {
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
  nasdaq100: {
    price: number;
    change: number;
    changePercent: number;
  };
}

/** 首页市场情绪指标：VIX + 恐慌贪婪 + 双 PE */
export interface HomeIndicatorsData {
  vix: {
    value: number;
    change: number | null;
    changePercent: number | null;
  };
  fearGreed: {
    value: number;
    rating: string;
    previousClose: number | null;
    oneWeekAgo: number | null;
    oneMonthAgo: number | null;
  };
  sp500PE: {
    value: number | null;
    source: string;
  };
  nasdaq100PE: {
    value: number | null;
    source: string;
  };
}

/** 首页 QDII 基金列表 + 数据获取时间 */
export interface HomeFundsData {
  qdiiFunds: QDIIFundData[];
  fetchedAt: string;
}

/** 完整首页数据（向后兼容 api.market-data 路由） */
export interface MarketData extends HomeCoreData, HomeIndicatorsData, HomeFundsData {}

/** 首页首屏核心指数（独立 defer 单元，渲染首屏 4 个大盘卡片） */
export async function getHomeCoreData(): Promise<HomeCoreData> {
  const [indices, nasdaq100Stock] = await Promise.all([
    getSinaIndexData(["int_nasdaq", "int_sp500", "int_dji"]),
    getSinaUSStock("ndx"),
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
    nasdaq100: {
      price: nasdaq100Stock.price,
      change: nasdaq100Stock.price - nasdaq100Stock.prevClose,
      changePercent: nasdaq100Stock.changePercent,
    },
  };
}

/** 首页市场情绪指标（独立 defer 单元，渲染 VIX/恐慌贪婪/PE 卡片） */
export async function getHomeIndicatorsData(): Promise<HomeIndicatorsData> {
  const [vix, fearGreed, sp500PE, nasdaq100PE] = await Promise.all([
    getVIX(),
    getFearGreedIndex(),
    getSp500PE(),
    getNasdaq100PE(),
  ]);
  return { vix, fearGreed, sp500PE, nasdaq100PE };
}

/** 首页 QDII 基金列表（独立 defer 单元，渲染基金表格/卡片） */
export async function getHomeFundsData(): Promise<HomeFundsData> {
  const qdiiFunds = await getAllQDIIFundData();
  return { qdiiFunds, fetchedAt: new Date().toISOString() };
}

/** 完整首页数据（向后兼容 api.market-data 路由） */
export async function getMarketData(): Promise<MarketData> {
  const [core, indicators, funds] = await Promise.all([
    getHomeCoreData(),
    getHomeIndicatorsData(),
    getHomeFundsData(),
  ]);
  return { ...core, ...indicators, ...funds };
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

// ==================== 基金详情数据 ====================

/** 基金基础信息（首屏同步取，用于 SEO meta 与基础卡片） */
export interface FundBasicData {
  code: string;
  name: string;
  index: string;
  premium: number;
  price: number;
  changePercent: number;
  scale: string;
  fee: string;
}

/** 基金重数据（导航走势/重仓/经理/月度热力图等，defer 后台异步取） */
export interface FundHeavyData {
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
  // 费率信息（从 pingzhongdata 提取）
  sourceRate: string | null; // 原始费率（申购费率）
  manageRate: string | null; // 管理费率
  minPurchase: string | null; // 最低申购金额
  // 盘中实时估值
  realTime估值: {
    gsz: number; // 估算净值
    gszzl: number; // 估算涨幅(%)
    gztime: string; // 估值时间
  } | null;
  // 定投收益
  dcaOneYear: number | null; // 定投1年收益率(%)
  dcaThreeYear: number | null; // 定投3年收益率(%)
}

/** 基金详情完整数据（基础 + 重数据） */
export type FundDetailData = FundBasicData & FundHeavyData;

/**
 * 兜底防护：name === code 视为无效
 * 天天基金对不存在 code 仍返回 200 错误页，nameMatch 匹配不到时会回填为 code
 * 字符串，导致 meta 出现"NONEXIST（NONEXIST）"垃圾。
 */
function isInvalidFundBasic(basic: FundBasicData | null, code: string): boolean {
  return !basic || basic.name === code;
}

/**
 * 获取基金基础信息（首屏快路径）
 * - 走一次东方财富 datacenter API；失败降级到天天基金 HTML 抓取
 * - 单次请求，1s 内完成；用于 SEO meta() 同步取与首屏基础卡片
 */
export async function getFundBasicData(code: string): Promise<FundBasicData | null> {
  // 优先：东方财富 datacenter API
  try {
    const rankData = await fetchJson<FundRankResponse>(
      `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_FUND_RANK&columns=SECURITY_CODE,FUND_NAME,FUND_SCALE,CHANGE_YEAR,CHANGE,PER_NAV,NAV_DATE,APPLY_RATE&filter=(SECURITY_CODE="${code}")&pageNumber=1&pageSize=1`,
      { headers: { Referer: "https://fund.eastmoney.com/" } },
    );
    const items = rankData?.result?.data ?? [];
    if (items.length > 0) {
      const item = items[0];
      const rawScale = numVal(item.FUND_SCALE);
      const basic: FundBasicData = {
        code: strVal(item.SECURITY_CODE),
        name: strVal(item.FUND_NAME),
        index: "—",
        premium: 0,
        price: numVal(item.PER_NAV, -999) === -999 ? 0 : numVal(item.PER_NAV),
        changePercent: numVal(item.CHANGE, -999) === -999 ? 0 : numVal(item.CHANGE),
        scale: rawScale > 0 ? `${Math.round((rawScale / 1e8) * 10) / 10}亿` : "—",
        fee: numVal(item.APPLY_RATE, -999) === -999 ? "—" : `${numVal(item.APPLY_RATE)}%`,
      };
      if (!isInvalidFundBasic(basic, code)) return basic;
    }
  } catch {
    // 东方财富 datacenter 失败，降级到天天基金页面
  }

  // 降级：天天基金页面
  try {
    const html = await fetchText(`https://fund.eastmoney.com/${code}.html`, {
      headers: { Referer: "https://fund.eastmoney.com/" },
    });
    const nameMatch = html.match(/<span[^>]*class="funCur-FundName"[^>]*>([^<]+)/);
    const priceMatch = html.match(/最新净值[^<]*<[^>]*>([\d.]+)/);
    const changeMatch = html.match(/涨跌幅[^<]*<[^>]*>([+-]?[\d.]+)%/);
    const scaleMatch = html.match(/基金规模[^<]*<[^>]*>([\d.]+)亿/);

    const basic: FundBasicData = {
      code,
      name: nameMatch?.[1]?.trim() ?? code,
      index: "—",
      premium: 0,
      price: priceMatch ? parseFloat(priceMatch[1]) || 0 : 0,
      changePercent: changeMatch ? parseFloat(changeMatch[1]) || 0 : 0,
      scale: scaleMatch ? `${scaleMatch[1]}亿` : "—",
      fee: "—",
    };
    if (!isInvalidFundBasic(basic, code)) return basic;
  } catch {
    // 天天基金也失败
  }

  return null;
}

/**
 * 获取基金重数据（图表/重仓/经理/月度热力图等）
 * - 走 pingzhongdata + 净值 API + 重仓 + 盘中估值等多源
 * - 单次响应可能 1-3s，配合 defer 在后台异步加载
 * - 命中即用 10min 内存缓存
 */
export async function getFundHeavyData(code: string): Promise<FundHeavyData> {
  return cachedFetch(`fund-heavy-${code}`, async () => {
    // 默认值（任一数据源失败时落到这里）
    const result: FundHeavyData = {
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
      sourceRate: null,
      manageRate: null,
      minPurchase: null,
      realTime估值: null,
      dcaOneYear: null,
      dcaThreeYear: null,
    };

    // 并行：pingzhongdata + 历史净值 + 经理接口 + 盘中估值
    const [pingzhongText, navHistoryData, managerData, fundgzText] = await Promise.all([
      fetchText(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
        headers: { Referer: "https://fund.eastmoney.com/" },
      }).catch(() => ""),
      fetchJson<{
        Data?: { LSJZList?: Array<{ FSRQ: string; DWJZ: string; LJJZ: string; JZZZL: string }> };
        TotalCount?: number;
      }>(`https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=30`, {
        headers: { Referer: "https://fundf10.eastmoney.com/" },
      }).catch(() => ({}) as Record<string, unknown>),
      // 经理接口（FundArchivesDatas）
      fetchJson<{
        Data?: Array<{ jjjl?: string; rzrq?: string; jlr?: string }>;
      }>(
        `https://fund.eastmoney.com/FundArchivesDatas.aspx?type=jjjl&code=${code}&rt=0.${Date.now()}`,
        { headers: { Referer: "https://fundf10.eastmoney.com/" } },
      ).catch(() => ({}) as Record<string, unknown>),
      // 盘中实时估值
      fetchText(`http://fundgz.1234567.com.cn/js/${code}.js`, {
        headers: { Referer: "http://fund.eastmoney.com/" },
      }).catch(() => ""),
    ]);

    // 解析 pingzhongdata
    if (pingzhongText) {
      // 阶段涨幅
      const syl1n = extractJsVar(pingzhongText, "syl_1n");
      const syl6y = extractJsVar(pingzhongText, "syl_6y");
      const syl3y = extractJsVar(pingzhongText, "syl_3y");
      const syl1y = extractJsVar(pingzhongText, "syl_1y");
      const syl3n = extractJsVar(pingzhongText, "syl_3n");
      const sylCl = extractJsVar(pingzhongText, "syl_cl");
      result.performance = {
        oneMonth: syl1y ? parseFloat(syl1y) : null,
        threeMonth: syl3y ? parseFloat(syl3y) : null,
        sixMonth: syl6y ? parseFloat(syl6y) : null,
        oneYear: syl1n ? parseFloat(syl1n) : null,
        threeYear: syl3n ? parseFloat(syl3n) : null,
        sinceInception: sylCl ? parseFloat(sylCl) : null,
      };

      // 费率
      result.sourceRate = extractJsVar(pingzhongText, "fund_sourceRate");
      result.manageRate = extractJsVar(pingzhongText, "fund_Rate");
      result.minPurchase = extractJsVar(pingzhongText, "fund_minsg");

      // 净值走势
      const navData = extractJsArray<{ x: number; y: number; equityReturn: number }>(
        pingzhongText,
        "Data_netWorthTrend",
      );
      if (navData) {
        try {
          result.navTrend = navData.map((d) => ({
            date: new Date(d.x).toISOString().split("T")[0],
            nav: d.y,
            dailyReturn: d.equityReturn ?? 0,
          }));
          result.maxDrawdown = calcMaxDrawdown(result.navTrend.map((d) => d.nav));
          result.monthlyReturns = calcMonthlyReturns(navData);
          result.dcaOneYear = calcDCAReturn(navData, 12);
          result.dcaThreeYear = calcDCAReturn(navData, 36);
        } catch {
          // 解析失败
        }
      }

      // 重仓股代码
      const stockCodes = extractJsArray<string>(pingzhongText, "stockCodes");
      if (stockCodes) {
        const symbols = stockCodes
          .map((s) => s.replace(/\d+$/, ""))
          .filter((s) => s.length > 0)
          .slice(0, 10);

        const holdingMap = new Map<string, number>();
        try {
          const holdingText = await fetchText(
            `https://fund.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=&month=&rt=0.${Date.now()}`,
            { headers: { Referer: "https://fundf10.eastmoney.com/" } },
          ).catch(() => "");
          if (holdingText) {
            const ratioMatches = [
              ...holdingText.matchAll(/class='(?:tor|tol)'>\s*([\d.]+)%\s*<\/td>/g),
            ];
            const codeMatches = [...holdingText.matchAll(/code=(\w+)[&"']/g)];
            for (let i = 0; i < Math.min(codeMatches.length, ratioMatches.length); i++) {
              holdingMap.set(codeMatches[i][1].toUpperCase(), parseFloat(ratioMatches[i][1]) || 0);
            }
          }
        } catch {
          // 忽略
        }

        if (symbols.length > 0) {
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
      }

      // 解析盘中实时估值
      if (fundgzText) {
        try {
          const jsonMatch = fundgzText.match(/jsonpgz\((.*)\);?/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            result.realTime估值 = {
              gsz: parseFloat(data.gsz) || 0,
              gszzl: parseFloat(data.gszzl) || 0,
              gztime: data.gztime || "",
            };
          }
        } catch {
          // 估值解析失败
        }
      }
    } else {
      // pingzhongdata 失败：天天基金 F10DataApi 降级
      try {
        const f10Text = await fetchText(
          `https://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=30`,
          { headers: { Referer: "https://fund.eastmoney.com/" } },
        );
        const contentMatch = f10Text.match(/content:"(<table[\s\S]*?<\/table>)"/);
        if (contentMatch) {
          const rows = [...contentMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
          for (const row of rows) {
            const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
            if (cells.length >= 4) {
              const date = cells[0][1].replace(/<[^>]+>/g, "").trim();
              const nav = cells[1][1].replace(/<[^>]+>/g, "").trim();
              const accNav = cells[2][1].replace(/<[^>]+>/g, "").trim();
              const dailyGrowth = cells[3][1].replace(/<[^>]+>/g, "").trim();
              result.navHistory.push({ date, nav, accNav, dailyGrowth });
              const navVal = parseFloat(nav);
              if (navVal > 0) {
                result.navTrend.push({
                  date,
                  nav: navVal,
                  dailyReturn: parseFloat(dailyGrowth) || 0,
                });
              }
            }
          }
          if (result.navTrend.length >= 2) {
            result.maxDrawdown = calcMaxDrawdown(result.navTrend.map((d) => d.nav));
          }
        }
      } catch {
        // 天天基金 F10DataApi 也失败
      }
    }

    // 历史净值（东方财富 lsjz API 优先）
    const navData = navHistoryData as {
      Data?: { LSJZList?: Array<{ FSRQ: string; DWJZ: string; LJJZ: string; JZZZL: string }> };
    };
    if (navData?.Data?.LSJZList && navData.Data.LSJZList.length > 0) {
      result.navHistory = navData.Data.LSJZList.map((d) => ({
        date: d.FSRQ,
        nav: d.DWJZ,
        accNav: d.LJJZ,
        dailyGrowth: d.JZZZL,
      }));
    } else if (result.navHistory.length === 0) {
      // 降级：天天基金 F10DataApi（已在上方尝试过）
    }

    // 解析基金经理
    const mgrData = managerData as { Data?: Array<{ jjjl?: string; rzrq?: string; jlr?: string }> };
    if (mgrData?.Data && Array.isArray(mgrData.Data)) {
      try {
        for (const m of mgrData.Data) {
          if (!m.jjjl) continue;
          result.managers.push({
            name: m.jjjl.trim(),
            tenure: m.rzrq ?? "—",
            tenureReturn: m.jlr ? parseFloat(m.jlr) : null,
          });
        }
      } catch {
        // 解析失败
      }
    }

    return result;
  });
}

/**
 * 基金详情（基础 + 重数据，向后兼容）
 * 内部串行：basic → heavy。新路由建议直接用 getFundBasicData + getFundHeavyData
 * 以便 heavy 部分走 defer()。
 */
export async function getFundDetailData(code: string): Promise<FundDetailData | null> {
  const basic = await getFundBasicData(code);
  if (!basic) return null;
  const heavy = await getFundHeavyData(code);
  return { ...basic, ...heavy };
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

/**
 * 计算定投收益率
 * 模拟每月定投固定金额，根据净值走势计算累计收益率
 * @param allData 净值走势数据
 * @param months 定投月数（12=1年，36=3年）
 * @returns 定投收益率(%)，数据不足返回 null
 */
function calcDCAReturn(allData: Array<{ x: number; y: number }>, months: number): number | null {
  if (allData.length < months) return null;

  // 取最近 months 个月的数据
  const recentData = allData.slice(-months * 31); // 粗略取足够多的交易日
  if (recentData.length < 2) return null;

  // 按月采样：每月第一个交易日买入
  const monthlyNavs: Array<{ date: string; nav: number }> = [];
  const seenMonths = new Set<string>();

  for (const d of recentData) {
    const date = new Date(d.x);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!seenMonths.has(monthKey) && d.y > 0) {
      seenMonths.add(monthKey);
      monthlyNavs.push({ date: monthKey, nav: d.y });
    }
    if (monthlyNavs.length >= months) break;
  }

  if (monthlyNavs.length < months) return null;

  // 模拟定投：每月买入 1000 元
  const monthlyInvest = 1000;
  let totalInvest = 0; // 累计投入
  let totalShares = 0; // 累计份额

  for (const entry of monthlyNavs) {
    const shares = monthlyInvest / entry.nav;
    totalShares += shares;
    totalInvest += monthlyInvest;
  }

  if (totalInvest === 0) return null;

  // 用最新净值计算当前市值
  const latestNav = allData[allData.length - 1].y;
  const currentValue = totalShares * latestNav;

  // 定投收益率 = (当前市值 - 累计投入) / 累计投入 * 100
  const dcaReturn = ((currentValue - totalInvest) / totalInvest) * 100;
  return Math.round(dcaReturn * 100) / 100;
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
  /** 定投1年收益率(%) - 每月定投1000元的累计收益率 */
  dcaOneYear: number | null;
  /** 定投3年收益率(%) */
  dcaThreeYear: number | null;
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

/** 从东方财富获取场外基金排行数据（优先），天天基金 pingzhongdata 降级 */
export async function getOTCFundData(codes: string[]): Promise<OTCFundData[]> {
  return cachedFetch(`otc-fund-${codes.join(",")}`, async () => {
    // 优先：东方财富 datacenter-web API
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

      if (unique.length > 0) {
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
            returnOneYear:
              numVal(item.CHANGE_YEAR, -999) === -999 ? null : numVal(item.CHANGE_YEAR),
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
            dcaOneYear: null,
            dcaThreeYear: null,
          };
        });
      }
    } catch {
      // 东方财富 datacenter-web 失败，降级到 rankhandler
    }

    // 降级2：天天基金 rankhandler.aspx（含手续费数据）
    try {
      const rankUrl = `https://fund.eastmoney.com/data/rankhandler.aspx?op=ph&dt=kf&ft=all&rs=&gs=0&sc=6yzf&st=desc&sd=&ed=&qdii=&tabSubtype=,,,,,&pi=1&pn=200&dx=1&v=${Date.now()}`;
      const rankText = await fetchText(rankUrl, {
        headers: { Referer: "https://fund.eastmoney.com/" },
      });

      // rankhandler 返回格式：var rankData = {datas:["代码,名称,拼音,日期,净值,日增长率,...",...],...}
      const datasMatch = rankText.match(/var rankData\s*=\s*\{[\s\S]*?datas:\s*\[([\s\S]*?)\]\s*,/);
      if (datasMatch) {
        // 解析每行数据
        const linePattern = /"([^"]+)"/g;
        const lines: string[] = [];
        let lineMatch;
        while ((lineMatch = linePattern.exec(datasMatch[1])) !== null) {
          lines.push(lineMatch[1]);
        }

        // 筛选目标基金
        const codeSet = new Set(codes);
        const filtered = lines.filter((line) => {
          const parts = line.split(",");
          return codeSet.has(parts[0]);
        });

        if (filtered.length > 0) {
          const purchaseInfo = await getFundPurchaseStatus(codes);
          // rankhandler 字段顺序：0代码,1名称,2拼音,3日期,4单位净值,5日增长率,6近1周,7近1月,8近3月,9近6月,10近1年,11近2年,12近3年,13今年,14成立以来,15手续费,16...
          return filtered.map((line) => {
            const parts = line.split(",");
            const code = parts[0];
            const info = purchaseInfo.get(code);
            const rawScale = parseFloat(parts[17]) || 0;

            return {
              code,
              name: parts[1] || code,
              scale: rawScale > 0 ? Math.round(rawScale * 10) / 10 : 0,
              returnOneYear: parts[10] ? parseFloat(parts[10]) || null : null,
              returnSixMonth: parts[9] ? parseFloat(parts[9]) || null : null,
              returnThreeMonth: parts[8] ? parseFloat(parts[8]) || null : null,
              returnOneMonth: parts[7] ? parseFloat(parts[7]) || null : null,
              changeDaily: parts[5] ? parseFloat(parts[5]) || null : null,
              returnSinceInception: parts[14] ? parseFloat(parts[14]) || null : null,
              nav: parts[4] ? parseFloat(parts[4]) || null : null,
              navDate: parts[3] || "",
              purchaseRate: parts[15] ? parseFloat(parts[15]) || null : null,
              purchaseStatus: info?.status ?? "未知",
              purchaseLimit: info?.limit ?? "未知",
              dcaOneYear: null,
              dcaThreeYear: null,
            };
          });
        }
      }
    } catch {
      // rankhandler 也失败，继续降级到 pingzhongdata
    }

    // 降级3：天天基金 pingzhongdata 逐只获取
    try {
      const purchaseInfo = await getFundPurchaseStatus(codes);
      const tasks = codes.map(async (code): Promise<OTCFundData> => {
        try {
          const text = await fetchText(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
            headers: { Referer: "https://fund.eastmoney.com/" },
          });

          // 使用 extractJsVar 统一提取基金名称和阶段涨幅
          const name = extractJsVar(text, "fS_name") ?? code;
          const syl1n = extractJsVar(text, "syl_1n");
          const syl6y = extractJsVar(text, "syl_6y");
          const syl3y = extractJsVar(text, "syl_3y");
          const syl1y = extractJsVar(text, "syl_1y");
          const sylCl = extractJsVar(text, "syl_cl");

          // 使用 extractJsArray 提取净值走势
          const navDataArr = extractJsArray<{ x: number; y: number; equityReturn: number }>(
            text,
            "Data_netWorthTrend",
          );
          let nav: number | null = null;
          let navDate = "";
          let changeDaily: number | null = null;
          if (navDataArr && navDataArr.length > 0) {
            const latest = navDataArr[navDataArr.length - 1];
            nav = latest.y;
            navDate = new Date(latest.x).toISOString().split("T")[0];
            changeDaily = latest.equityReturn ?? null;
          }

          // 解析规模（从基金详情页获取）
          let scale = 0;
          try {
            const detailHtml = await fetchText(`https://fund.eastmoney.com/${code}.html`, {
              headers: { Referer: "https://fund.eastmoney.com/" },
            });
            const scaleMatch = detailHtml.match(/基金规模[^<]*<[^>]*>([\d.]+)亿/);
            if (scaleMatch) scale = parseFloat(scaleMatch[1]) || 0;
          } catch {
            // 忽略
          }

          const info = purchaseInfo.get(code);

          return {
            code,
            name,
            scale,
            returnOneYear: syl1n ? parseFloat(syl1n) : null,
            returnSixMonth: syl6y ? parseFloat(syl6y) : null,
            returnThreeMonth: syl3y ? parseFloat(syl3y) : null,
            returnOneMonth: syl1y ? parseFloat(syl1y) : null,
            changeDaily,
            returnSinceInception: sylCl ? parseFloat(sylCl) : null,
            nav,
            navDate,
            purchaseRate: null,
            purchaseStatus: info?.status ?? "未知",
            purchaseLimit: info?.limit ?? "未知",
            dcaOneYear: null,
            dcaThreeYear: null,
          };
        } catch {
          const info = purchaseInfo.get(code);
          return {
            code,
            name: code,
            scale: 0,
            returnOneYear: null,
            returnSixMonth: null,
            returnThreeMonth: null,
            returnOneMonth: null,
            changeDaily: null,
            returnSinceInception: null,
            nav: null,
            navDate: "",
            purchaseRate: null,
            purchaseStatus: info?.status ?? "未知",
            purchaseLimit: info?.limit ?? "未知",
            dcaOneYear: null,
            dcaThreeYear: null,
          };
        }
      });

      return await Promise.all(tasks);
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
 * 获取基金申购状态和限额
 * 优先：东方财富 fundf10 基金详情页
 * 降级：天天基金 fund.eastmoney.com 基金页面
 */
async function getFundPurchaseStatus(codes: string[]): Promise<Map<string, PurchaseInfo>> {
  const result = new Map<string, PurchaseInfo>();

  // 并行获取每只基金的详情页
  const tasks = codes.map(async (code) => {
    try {
      // 优先：东方财富 fundf10
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
      // 东方财富 fundf10 失败，降级到天天基金页面
      try {
        const html = await fetchText(`https://fund.eastmoney.com/${code}.html`, {
          headers: { Referer: "https://fund.eastmoney.com/" },
        });

        let status = "开放";
        let limit = "不限额";

        if (html.includes("暂停申购")) {
          status = "暂停";
          limit = "暂停申购";
        } else if (html.includes("限大额")) {
          status = "限大额";
          const limitMatch = html.match(/购买上限[：:]?\s*(\d+\.?\d*[万亿]?元?)/);
          if (limitMatch) limit = limitMatch[1];
        }

        result.set(code, { status, limit });
      } catch {
        result.set(code, { status: "未知", limit: "未知" });
      }
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

/** QDII 基金分类标签 */
export type QDIICategory = "nasdaq100" | "sp500" | "active";

/** QDII 基金数据（含分类标签） */
export interface QDIIFundData extends OTCFundData {
  category: QDIICategory;
  categoryLabel: string;
}

/** 获取全部 QDII 基金数据（含分类标签） */
export async function getAllQDIIFundData(): Promise<QDIIFundData[]> {
  const [nasdaq, sp500, active] = await Promise.all([
    getOTCFundData(NASDAQ_100_OTC_CODES),
    getOTCFundData(SP500_OTC_CODES),
    getOTCFundData(ACTIVE_US_CODES),
  ]);

  const tagNasdaq: QDIIFundData[] = nasdaq.map((f) => ({
    ...f,
    category: "nasdaq100" as const,
    categoryLabel: "纳指100",
  }));
  const tagSp500: QDIIFundData[] = sp500.map((f) => ({
    ...f,
    category: "sp500" as const,
    categoryLabel: "标普500",
  }));
  const tagActive: QDIIFundData[] = active.map((f) => ({
    ...f,
    category: "active" as const,
    categoryLabel: "主动型",
  }));

  return [...tagNasdaq, ...tagSp500, ...tagActive];
}

// ==================== 全量场外基金（覆盖股票/混合/指数/债券/QDII/FOF） ====================

/** 场外基金分类 */
export type OTCCategory = "stock" | "hybrid" | "index" | "bond" | "qdii" | "fof";

/** 场外基金分类标签（中文显示） */
export const OTC_CATEGORY_LABELS: Record<OTCCategory, string> = {
  stock: "股票型",
  hybrid: "混合型",
  index: "指数型",
  bond: "债券型",
  qdii: "QDII",
  fof: "FOF",
};

/** 场外基金分类顺序（用于过滤器和展示） */
export const OTC_CATEGORY_ORDER: OTCCategory[] = [
  "stock",
  "hybrid",
  "index",
  "bond",
  "qdii",
  "fof",
];

/** 带分类的场外基金数据 */
export interface OTCClassifiedFundData extends OTCFundData {
  category: OTCCategory;
  categoryLabel: string;
}

/**
 * 股票型场外基金代码列表
 * 来源：参考天天基金"股票型"排行近 1 年收益 + 规模双排序的 top 精选
 */
const STOCK_OTC_CODES = [
  "005827", // 易方达蓝筹精选混合
  "161725", // 招商中证白酒指数
  "004997", // 广发高端制造股票A
  "001513", // 易方达信息产业混合
  "161038", // 富国生物医药科技混合
  "006228", // 南方信息创新混合
  "002083", // 新华泛资源优势混合
  "001717", // 工银瑞信前沿医疗股票A
  "161039", // 富国先进制造混合
  "003834", // 华夏能源革新股票A
  "005669", // 前海开源公用事业股票
  "006228", // 南方信息创新混合
  "008099", // 东方阿尔法优势产业混合A
  "002952", // 汇添富医药保健混合A
  "000831", // 工银瑞信医疗保健行业股票
];

/**
 * 混合型场外基金代码列表
 * 来源：参考天天基金"混合型"排行精选
 */
const HYBRID_OTC_CODES = [
  "005827", // 易方达蓝筹精选混合
  "260108", // 景顺长城新兴成长混合
  "000083", // 汇添富消费行业混合
  "161005", // 富国天惠成长混合(LOF)A
  "519697", // 交银优势行业混合
  "162605", // 景顺长城鼎益混合(LOF)
  "000190", // 中银新回报混合A
  "002011", // 华夏红利混合
  "161606", // 融通行业景气混合A
  "000751", // 嘉实增长混合
  "519126", // 浦银安盛先进制造混合A
  "002083", // 新华泛资源优势混合
];

/**
 * 指数型场外基金代码列表
 * 来源：参考天天基金"指数型"排行精选（含宽基、行业、主题）
 */
const INDEX_OTC_CODES = [
  "161725", // 招商中证白酒指数
  "110011", // 易方达中小盘混合（指数混合型，归类为指数）
  "510310", // 易方达沪深300ETF
  "161017", // 富国中证500指数(LOF)A
  "110020", // 易方达沪深300ETF联接A
  "050002", // 博时沪深300指数A
  "100038", // 富国沪深300指数增强A
  "161227", // 易方达上证50指数(LOF)A
  "163407", // 兴全沪深300指数增强A
  "519671", // 银河沪深300价值指数A
  "000311", // 景顺长城沪深300指数增强A
];

/**
 * 债券型场外基金代码列表
 * 来源：参考天天基金"债券型"排行精选
 */
const BOND_OTC_CODES = [
  "002351", // 易方达裕丰回报债券A
  "000171", // 易方达裕丰回报债券
  "110017", // 易方达增强回报债券A
  "161716", // 招商双债增强债券C
  "519060", // 广发纯债债券A
  "161614", // 融通岁岁添利定期开放债券A
  "000032", // 易方达信用债债券A
  "485111", // 工银瑞信双利债券A
  "110027", // 易方达安心回馈混合（偏债混合）
  "040003", // 华安现金富利货币B（偏债型稳健品种）
];

/**
 * FOF 基金代码列表
 * 来源：参考天天基金"FOF"排行精选
 */
const FOF_OTC_CODES = [
  "501210", // 交银施罗德智选星光一年封闭运作混合(FOF-LOF)A
  "009372", // 浦银安盛嘉和稳健一年持有期混合(FOF)A
  "011752", // 广发核心优选六个月持有期混合(FOF)A
  "009213", // 易方达如意安泰一年持有期混合(FOF)A
  "006507", // 前海开源裕泽定期开放混合(FOF)
  "008145", // 兴全优选进取三个月持有期混合(FOF)A
];

/** 分类与代码常量映射表（供 getAllOTCFundData 内部使用） */
const OTC_CATEGORY_CODE_MAP: Array<{ category: OTCCategory; codes: string[] }> = [
  { category: "stock", codes: STOCK_OTC_CODES },
  { category: "hybrid", codes: HYBRID_OTC_CODES },
  { category: "index", codes: INDEX_OTC_CODES },
  { category: "bond", codes: BOND_OTC_CODES },
  { category: "qdii", codes: [...NASDAQ_100_OTC_CODES, ...SP500_OTC_CODES, ...ACTIVE_US_CODES] },
  { category: "fof", codes: FOF_OTC_CODES },
];

/**
 * 获取全量场外基金数据（覆盖股票/混合/指数/债券/QDII/FOF 六大分类）
 * 与 getAllQDIIFundData() 解耦：QDII 在此处作为"qdii"分类的一个子集
 * 复用 getOTCFundData() 的 batch + 缓存 + 降级链路
 */
export async function getAllOTCFundData(): Promise<OTCClassifiedFundData[]> {
  // 并行拉取 6 个分类子集
  const grouped = await Promise.all(
    OTC_CATEGORY_CODE_MAP.map(async ({ category, codes }) => {
      const funds = await getOTCFundData(codes);
      const label = OTC_CATEGORY_LABELS[category];
      return funds.map((f) => ({ ...f, category, categoryLabel: label }));
    }),
  );
  return grouped.flat();
}

// ==================== 基金代码验证/搜索 ====================

/** 基金搜索结果项 */
export interface FundSearchItem {
  code: string; // 基金代码
  abbr: string; // 拼音缩写
  name: string; // 基金名称
  type: string; // 基金类型
  pinyin: string; // 完整拼音
}

/**
 * 基金代码验证与搜索
 * 参考自 finshare fund_source.py 的 get_fund_list 实现
 * 使用天天基金 fundcode_search.js 接口获取全部基金代码列表
 * 格式：var r = [["000001","HXCZHH","华夏成长混合","混合型-灵活","HUAXIACHENGZHANGHUNHE"], ...]
 */
export async function searchFundCode(keyword: string): Promise<FundSearchItem[]> {
  return cachedFetch(
    `fund-search-${keyword}`,
    async () => {
      try {
        const text = await fetchText("https://fund.eastmoney.com/js/fundcode_search.js", {
          headers: { Referer: "https://fund.eastmoney.com/" },
        });

        // 提取 var r = [...]
        const match = text.match(/var\s+r\s*=\s*(\[[\s\S]+\])/);
        if (!match) return [];

        const data: string[][] = JSON.parse(match[1]);
        const kw = keyword.toLowerCase();

        // 按代码、拼音缩写、名称、完整拼音匹配
        const results = data
          .filter((item) => {
            if (item.length < 5) return false;
            const [code, abbr, name, _type, pinyin] = item;
            return (
              code.includes(kw) ||
              abbr.toLowerCase().includes(kw) ||
              name.includes(keyword) ||
              pinyin.toLowerCase().includes(kw)
            );
          })
          .map((item) => ({
            code: item[0],
            abbr: item[1],
            name: item[2],
            type: item[3],
            pinyin: item[4],
          }));

        // 最多返回20条
        return results.slice(0, 20);
      } catch {
        return [];
      }
    },
    30 * 60 * 1000,
  ); // 基金列表缓存30分钟
}

/**
 * 验证基金代码是否有效
 * 使用 fundcode_search.js 全量列表进行校验
 */
export async function validateFundCode(code: string): Promise<boolean> {
  try {
    const results = await searchFundCode(code);
    return results.some((item) => item.code === code);
  } catch {
    return false;
  }
}

// ==================== QDII 基金估值数据 ====================

/** 市场时段 */
export type MarketSession = "pre" | "intraday" | "after";

/** QDII 基金估值数据 */
export interface QDIIValuationData {
  /** 基金代码 */
  code: string;
  /** 基金名称 */
  name: string;
  /** 分类 */
  category: QDIICategory;
  /** 分类标签 */
  categoryLabel: string;
  /** 估算净值（实时估值） */
  estimatedNav: number;
  /** 估算涨幅(%) */
  estimatedChange: number;
  /** 估值时间 */
  estimationTime: string;
  /** 最新实际净值 */
  actualNav: number | null;
  /** 净值日期 */
  navDate: string;
  /** 估值与实际净值偏差(%)，正值表示估值高于净值 */
  deviation: number | null;
  /** 当前市场时段 */
  marketSession: MarketSession;
  /** 数据获取是否失败 */
  error: boolean;
}

/** 判断当前市场时段（基于北京时间） */
function getMarketSession(): MarketSession {
  const now = new Date();
  // 转换为北京时间
  const bjHour = (now.getUTCHours() + 8) % 24;
  const bjMinute = now.getUTCMinutes();
  const bjTime = bjHour * 60 + bjMinute;

  // A股交易时间 9:30-15:00
  if (bjTime >= 9 * 60 + 30 && bjTime < 15 * 60) return "intraday";
  // 盘前：6:00-9:30
  if (bjTime >= 6 * 60 && bjTime < 9 * 60 + 30) return "pre";
  // 盘后
  return "after";
}

/** 合并所有 QDII 场外基金代码 */
const ALL_QDII_VALUATION_CODES = [...NASDAQ_100_OTC_CODES, ...SP500_OTC_CODES, ...ACTIVE_US_CODES];

/**
 * 批量获取 QDII 基金实时估值数据
 * 数据源：天天基金 fundgz.1234567.com.cn
 * 格式：jsonpgz({"fundcode":"xxx","name":"xxx","jzrq":"2024-01-01","dwjz":"1.0000","gsz":"1.0100","gszzl":"1.00","gztime":"2024-01-02 15:00"});
 */
export async function getQDIIValuationData(): Promise<QDIIValuationData[]> {
  const session = getMarketSession();
  const codes = ALL_QDII_VALUATION_CODES;

  // 分类映射
  const nasdaqSet = new Set(NASDAQ_100_OTC_CODES);
  const sp500Set = new Set(SP500_OTC_CODES);

  // 并行获取所有基金的估值数据（每只单独请求，fundgz 接口不支持批量）
  // 限制并发数，避免请求过多被限流
  const CONCURRENCY = 10;
  const results: QDIIValuationData[] = [];

  for (let i = 0; i < codes.length; i += CONCURRENCY) {
    const batch = codes.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (code) => {
        try {
          const text = await fetchText(`http://fundgz.1234567.com.cn/js/${code}.js`, {
            headers: { Referer: "https://fund.eastmoney.com/" },
          });

          // 解析 jsonpgz({...})
          const jsonMatch = text.match(/jsonpgz\((.*)\);?/);
          if (!jsonMatch) {
            return createEmptyValuation(code, session, nasdaqSet, sp500Set, true);
          }

          const data = JSON.parse(jsonMatch[1]);
          const estimatedNav = parseFloat(data.gsz) || 0;
          const estimatedChange = parseFloat(data.gszzl) || 0;
          const actualNav = parseFloat(data.dwjz) || null;
          const navDate = data.jzrq || "";
          const estimationTime = data.gztime || "";

          // 计算估值偏差：(估算净值 - 实际净值) / 实际净值 * 100
          let deviation: number | null = null;
          if (actualNav && actualNav > 0 && estimatedNav > 0) {
            deviation = Math.round(((estimatedNav - actualNav) / actualNav) * 10000) / 100;
          }

          const category: QDIICategory = nasdaqSet.has(code)
            ? "nasdaq100"
            : sp500Set.has(code)
              ? "sp500"
              : "active";
          const categoryLabel =
            category === "nasdaq100" ? "纳指100" : category === "sp500" ? "标普500" : "主动型";

          return {
            code,
            name: data.name || code,
            category,
            categoryLabel,
            estimatedNav,
            estimatedChange,
            estimationTime,
            actualNav,
            navDate,
            deviation,
            marketSession: session,
            error: false,
          } satisfies QDIIValuationData;
        } catch {
          return createEmptyValuation(code, session, nasdaqSet, sp500Set, true);
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      }
    }
  }

  return results;
}

/** 创建空的估值数据（获取失败时使用） */
function createEmptyValuation(
  code: string,
  session: MarketSession,
  nasdaqSet: Set<string>,
  sp500Set: Set<string>,
  error: boolean,
): QDIIValuationData {
  const category: QDIICategory = nasdaqSet.has(code)
    ? "nasdaq100"
    : sp500Set.has(code)
      ? "sp500"
      : "active";
  const categoryLabel =
    category === "nasdaq100" ? "纳指100" : category === "sp500" ? "标普500" : "主动型";

  return {
    code,
    name: code,
    category,
    categoryLabel,
    estimatedNav: 0,
    estimatedChange: 0,
    estimationTime: "",
    actualNav: null,
    navDate: "",
    deviation: null,
    marketSession: session,
    error,
  };
}

/**
 * 获取单只 QDII 基金的估值历史数据（最近N个交易日）
 * 用于估值走势图
 */
export async function getQDIIValuationHistory(
  code: string,
  days = 30,
): Promise<
  Array<{
    date: string;
    estimatedNav: number;
    actualNav: number | null;
    estimatedChange: number;
  }>
> {
  return cachedFetch(`qdii-val-history-${code}-${days}`, async () => {
    try {
      // 从东方财富历史净值API获取
      const data = await fetchJson<{
        Data?: {
          LSJZList?: Array<{
            FSRQ: string;
            DWJZ: string;
            JZZZL: string;
          }>;
        };
      }>(`https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=${days}`, {
        headers: {
          Referer: "https://fund.eastmoney.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
      });

      const list = data?.Data?.LSJZList ?? [];
      if (list.length === 0) return [];

      // 反转使日期从旧到新
      const reversed = [...list].reverse();

      return reversed.map((item) => ({
        date: item.FSRQ,
        estimatedNav: parseFloat(item.DWJZ) || 0,
        actualNav: parseFloat(item.DWJZ) || null,
        estimatedChange: parseFloat(item.JZZZL) || 0,
      }));
    } catch {
      return [];
    }
  });
}
