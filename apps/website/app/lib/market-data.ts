/**
 * 服务端数据获取层
 * 负责从外部API获取真实市场数据，带内存缓存
 *
 * 数据源策略（优先级从高到低）：
 * - 东方财富 datacenter API（结构化JSON，优先使用）
 * - 天天基金网（fund.eastmoney.com，降级处理）
 *
 * 数据源说明（国内可访问）：
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

/** 通用缓存获取，默认缓存5分钟。bypassCache=true 时跳过缓存读，但仍会写新结果 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
  opts: { bypassCache?: boolean } = {},
): Promise<T> {
  if (!opts.bypassCache) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttlMs) {
      return entry.data as T;
    }
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/** 通用 fetch 封装，带超时。init.timeoutMs 可覆盖默认 15s（用于需要更短超时的关键路径） */
async function fetchText(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<string> {
  const { timeoutMs, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      ...(rest.headers as Record<string, string>),
    },
    signal: AbortSignal.timeout(timeoutMs ?? 15_000),
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status}`);
  }
  return res.text();
}

/** 通用 fetchJson 封装，timeoutMs 透传给 fetchText */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const text = await fetchText(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  return JSON.parse(text) as T;
}

// ==================== 通用解析工具 ====================

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
  // 重仓股行情（扩展为完整持仓，2026-07-03 改造：top 10 → 全部）
  topHoldings: Array<{
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    holdingRatio: number; // 持仓占比(%)
    shareCount: number | null; // 持股数量(万股)
  }>;
  /** 持仓总数（topHoldings.length 可能为 0 走兜底；用来给 UI 展示「共 X 只持仓」） */
  holdingsTotal: number;
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
 * 降级基金基础信息（双源网络都失败时使用，name 用 code 占位让 loader 继续渲染）
 * - 重数据由 getFundHeavyData 独立获取，仍可能命中 10min 缓存拿到真实数据
 * - 组件可据此判断显示「数据获取失败」提示
 */
function makeDegradedBasic(code: string): FundBasicData {
  return {
    code,
    name: code,
    index: "—",
    premium: 0,
    price: 0,
    changePercent: 0,
    scale: "—",
    fee: "—",
  };
}

/** basic 路径的统一短超时（< SSR streamTimeout 6s，预留 cold start 余量） */
const BASIC_FETCH_TIMEOUT_MS = 4_500;

/**
 * 获取基金基础信息（首屏快路径）
 * - 走东方财富 datacenter API；失败降级到天天基金 HTML 抓取；双源都失败时返回降级数据
 * - 加 5min 内存缓存 + 单源 4.5s 短超时，避免在 SSR 6s 流式窗口内超时被 abort
 * - opts.bypassCache=true：跳过缓存读（但仍会写新结果），用于客户端后台重试
 * - 用于 SEO meta() 同步取与首屏基础卡片
 */
export async function getFundBasicData(
  code: string,
  opts: { bypassCache?: boolean } = {},
): Promise<FundBasicData | null> {
  return cachedFetch(
    `fund-basic-${code}`,
    async () => {
      // 优先：东方财富 datacenter API（短超时，避免单源慢拖累 SSR）
      try {
        const rankData = await fetchJson<FundRankResponse>(
          `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_FUND_RANK&columns=SECURITY_CODE,FUND_NAME,FUND_SCALE,CHANGE_YEAR,CHANGE,PER_NAV,NAV_DATE,APPLY_RATE&filter=(SECURITY_CODE="${code}")&pageNumber=1&pageSize=1`,
          {
            headers: { Referer: "https://fund.eastmoney.com/" },
            timeoutMs: BASIC_FETCH_TIMEOUT_MS,
          },
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
          if (isInvalidFundBasic(basic, code)) return null;
          return basic;
        }
        // 空数据：API 已确认不存在
        return null;
      } catch {
        // 东方财富 datacenter 失败，降级到天天基金页面
      }

      // 降级：天天基金页面
      try {
        const html = await fetchText(`https://fund.eastmoney.com/${code}.html`, {
          headers: { Referer: "https://fund.eastmoney.com/" },
          timeoutMs: BASIC_FETCH_TIMEOUT_MS,
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
        if (isInvalidFundBasic(basic, code)) return null;
        return basic;
      } catch {
        // 天天基金也失败
      }

      // 双源都失败：返回降级数据（name=code），让 loader 继续渲染而不是 404
      // 5min 缓存同样吸收，让突发网络问题不会重复打源站
      return makeDegradedBasic(code);
    },
    5 * 60 * 1000,
    { bypassCache: opts.bypassCache },
  );
}

/** 同步读取的基金基础数据状态（meta() 阶段使用） */
export type FundBasicStatus = "ok" | "degraded" | "notFound" | "unknown";

/**
 * 同步从内存缓存中读取基金基础数据状态（不发请求）
 * - "ok"：上次访问拿到真实数据（name !== code）
 * - "degraded"：上次访问网络全失败，缓存的是占位数据
 * - "notFound"：上次访问 API 确认基金不存在
 * - "unknown"：首次访问 / 缓存未命中（meta 用最保守的占位）
 *
 * 使用场景：meta() 阶段需要根据数据可用性给出不同的 SEO 默认值。
 * loader 同步调用本函数把 status 塞到 data，meta() 再根据 status 路由。
 */
export function peekFundBasicStatus(code: string): FundBasicStatus {
  const entry = cache.get(`fund-basic-${code}`);
  if (!entry) return "unknown";
  const data = entry.data;
  if (data === null || data === undefined) return "notFound";
  const basic = data as FundBasicData;
  if (basic.name === basic.code) return "degraded";
  return "ok";
}

/**
 * 获取基金重数据（图表/重仓/经理/月度热力图等）
 * - 走 pingzhongdata + 净值 API + 重仓 + 盘中估值等多源
 * - 单次响应可能 1-3s，配合 defer 在后台异步加载
 * - 命中即用 10min 内存缓存
 * - opts.bypassCache=true：跳过缓存读（但仍会写新结果），用于客户端后台重试
 *
 * 注意：本函数本身有兜底默认值（任一源失败 → 空数组/null），不会 reject；
 * 「重试」语义上主要是想重新打一次外部源看能不能拉回真实数据。失败时 UI 由
 * 重数据卡片内「暂无数据」占位兜住，不阻塞页面。
 */
export async function getFundHeavyData(
  code: string,
  opts: { bypassCache?: boolean } = {},
): Promise<FundHeavyData> {
  return cachedFetch(
    `fund-heavy-${code}`,
    async () => {
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
        holdingsTotal: 0,
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

        // 重仓股代码（已扩展为完整持仓：2026-07-03 改造）
        // - pingzhongdata.stockCodes 包含基金持有的所有股票代码
        // - FundArchivesDatas?type=jjcc&topline=200 拿全量持仓的占比 / 持股数 / 名称
        // - A 股实时价走 push2 批量接口；其他代码只展示披露信息，不请求海外行情
        const stockCodes = extractJsArray<string>(pingzhongText, "stockCodes");
        if (stockCodes && stockCodes.length > 0) {
          // 持仓明细：code → { ratio, shareCount, name }
          const holdingMap = new Map<
            string,
            { ratio: number; shareCount: number | null; name: string }
          >();
          try {
            const holdingText = await fetchText(
              `https://fund.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=200&year=&month=&rt=0.${Date.now()}`,
              { headers: { Referer: "https://fundf10.eastmoney.com/" } },
            ).catch(() => "");
            if (holdingText) {
              // 按行解析（每行是一只股票）
              // FundArchivesDatas 表格行结构：<tr><td>序号</td><td>代码</td><td><a>名称</a></td><td class='tor'>占比%</td><td class='tol'>持股数</td>...
              // 改用宽松的行级匹配：找所有 code=XXX 的链接 + 名称 + 占比 + 持股数
              const rowMatches = [
                ...holdingText.matchAll(
                  /code=([0-9A-Z]+)[^>]*>([^<]+)<\/a>[\s\S]*?class='tor'\s*>\s*([\d.]+)%[\s\S]*?class='tol'\s*>\s*([\d.,]+)/g,
                ),
              ];
              for (const m of rowMatches) {
                const c = m[1].toUpperCase();
                holdingMap.set(c, {
                  ratio: parseFloat(m[3]) || 0,
                  shareCount: parseFloat(String(m[4]).replace(/,/g, "")) || null,
                  name: m[2].trim(),
                });
              }
              // 兼容旧版：只有 tor 类没有 tol 的退化情况（用 name+ratio 兜底）
              if (holdingMap.size === 0) {
                const codeMatches = [...holdingText.matchAll(/code=(\w+)[&"']/g)];
                const ratioMatches = [
                  ...holdingText.matchAll(/class='(?:tor|tol)'>\s*([\d.]+)%\s*<\/td>/g),
                ];
                const nameMatches = [...holdingText.matchAll(/code=\w+[^>]*>([^<]+)<\/a>/g)];
                for (let i = 0; i < codeMatches.length; i++) {
                  holdingMap.set(codeMatches[i][1].toUpperCase(), {
                    ratio: parseFloat(ratioMatches[i]?.[1] ?? "0") || 0,
                    shareCount: null,
                    name: nameMatches[i]?.[1]?.trim() ?? codeMatches[i][1],
                  });
                }
              }
            }
          } catch {
            // 忽略
          }

          const aShareCodes = stockCodes.filter((c) => /^\d{6}$/.test(c));

          // A 股：批量拉 push2 实时价
          const aShareQuotes = new Map<
            string,
            { name: string; price: number; changePercent: number }
          >();
          if (aShareCodes.length > 0) {
            try {
              // 静态 import（use-stock-poll / stock.$code.tsx 也用了，构建期已被预加载，
              // 改动态 import 反而会被 Vite 警告 "ineffective dynamic import"）
              const { getStockQuotesBatch } = await import("./stock-data");
              const batch = await getStockQuotesBatch(aShareCodes);
              for (const [code, q] of batch) {
                aShareQuotes.set(code, {
                  name: q.name,
                  price: q.price ?? 0,
                  changePercent: q.changePercent ?? 0,
                });
              }
            } catch {
              // 拉取失败时 A 股 name 从 holdingMap 拿，price/changePercent 为 0
            }
          }

          // 合并：按 stockCodes 原顺序产出（保持与披露季报一致）
          for (const code of stockCodes) {
            const upper = code.toUpperCase();
            const meta = holdingMap.get(upper);
            const quote = /^\d{6}$/.test(code) ? aShareQuotes.get(code) : undefined;
            result.topHoldings.push({
              symbol: code,
              name: meta?.name || quote?.name || code,
              price: quote?.price ?? 0,
              changePercent: quote?.changePercent ?? 0,
              holdingRatio: meta?.ratio ?? 0,
              shareCount: meta?.shareCount ?? null,
            });
          }
          result.holdingsTotal = stockCodes.length;
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

      if (result.navTrend.length < 2 && result.navHistory.length > 1) {
        result.navTrend = buildNavTrendFromHistory(result.navHistory);
        if (result.navTrend.length >= 2) {
          result.maxDrawdown = calcMaxDrawdown(result.navTrend.map((d) => d.nav));
        }
      }

      // 解析基金经理
      const mgrData = managerData as {
        Data?: Array<{ jjjl?: string; rzrq?: string; jlr?: string }>;
      };
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
    },
    5 * 60 * 1000,
    { bypassCache: opts.bypassCache },
  );
}

function buildNavTrendFromHistory(
  navHistory: FundHeavyData["navHistory"],
): FundHeavyData["navTrend"] {
  return navHistory
    .map((row) => ({
      date: row.date,
      nav: parseFloat(row.nav),
      dailyReturn: parseFloat(String(row.dailyGrowth).replace("%", "")) || 0,
    }))
    .filter((row) => row.date && Number.isFinite(row.nav) && row.nav > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
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

// ==================== 全量场外基金（覆盖股票/混合/指数/债券/FOF） ====================

/** 场外基金分类 */
export type OTCCategory = "stock" | "hybrid" | "index" | "bond" | "fof";

/** 场外基金分类标签（中文显示） */
export const OTC_CATEGORY_LABELS: Record<OTCCategory, string> = {
  stock: "股票型",
  hybrid: "混合型",
  index: "指数型",
  bond: "债券型",
  fof: "FOF",
};

/** 场外基金分类顺序（用于过滤器和展示） */
export const OTC_CATEGORY_ORDER: OTCCategory[] = ["stock", "hybrid", "index", "bond", "fof"];

/** 公开产品页展示的场外基金分类 */
export const PUBLIC_OTC_CATEGORY_ORDER: OTCCategory[] = ["stock", "hybrid", "index", "bond", "fof"];

export function isPublicOTCCategory(category: string): category is OTCCategory {
  return (PUBLIC_OTC_CATEGORY_ORDER as readonly string[]).includes(category);
}

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
  { category: "fof", codes: FOF_OTC_CODES },
];

/**
 * 获取全量场外基金数据（覆盖股票/混合/指数/债券/FOF 五大分类）
 * 复用 getOTCFundData() 的 batch + 缓存 + 降级链路
 */
export async function getAllOTCFundData(): Promise<OTCClassifiedFundData[]> {
  // 并行拉取 5 个分类子集
  const grouped = await Promise.all(
    OTC_CATEGORY_CODE_MAP.map(async ({ category, codes }) => {
      const funds = await getOTCFundData(codes);
      const label = OTC_CATEGORY_LABELS[category];
      return funds.map((f) => ({ ...f, category, categoryLabel: label }));
    }),
  );
  return grouped.flat();
}

/** 获取公开场外基金数据（股票/混合/指数/债券/FOF） */
export async function getPublicOTCFundData(): Promise<OTCClassifiedFundData[]> {
  const funds = await getAllOTCFundData();
  return funds.filter((fund) => isPublicOTCCategory(fund.category));
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
