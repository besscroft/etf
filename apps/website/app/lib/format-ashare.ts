/** A 股通用数值格式化（金额/比例/价格），集中维护以便全模块一致 */

/** 成交额 / 市值（元）→ 万 / 亿 / 万亿 */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}万亿`;
  if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return `${value.toFixed(0)}`;
}

/** 成交量（手）→ 万手 / 亿手 */
export function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿手`;
  if (value >= 1e4) return `${(value / 1e4).toFixed(2)}万手`;
  return `${value.toFixed(0)}手`;
}

/** 价格（元） */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  return value.toFixed(2);
}

/** 涨跌幅 / 比例（%），带正负号 */
export function formatPercent(value: number, withSign = true): string {
  if (!Number.isFinite(value)) return "—";
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** 红涨绿跌的 Tailwind 文字色 class（A 股惯例） */
export function trendClass(value: number): string {
  if (value > 0) return "text-[color:var(--market-up)]";
  if (value < 0) return "text-[color:var(--market-down)]";
  return "text-muted-foreground";
}
