/**
 * 基金分析导出模板
 *
 * 适用模块：analysis（/analysis）
 *
 * 布局：
 * - 基金标题 + 代码徽章
 * - 核心四宫格：最新净值 / 近1年 / 最大回撤 / 规模
 * - 净值走势迷你图（近1年）
 * - 全周期收益 6 宫格
 * - 月度收益热力图（最近 12 个月）
 * - 基金经理信息
 * - 重仓股 Top5
 */
import type { FundDetailData } from "~/lib/market-data";
import type { ModuleTheme } from "../types";
import { ShareCardCanvas } from "../share-card-canvas";
import { withAlpha } from "../module-theme";

interface AnalysisTemplateProps {
  theme: ModuleTheme;
  fund: FundDetailData;
  generatedAt: string;
}

function fmtPct(v: number | null): { text: string; color: string } {
  if (v === null) return { text: "—", color: "#94a3b8" };
  const sign = v > 0 ? "+" : "";
  const color = v > 0 ? "#ef4444" : v < 0 ? "#10b981" : "#475569";
  return { text: `${sign}${v.toFixed(2)}%`, color };
}

export function AnalysisTemplate({ theme, fund, generatedAt }: AnalysisTemplateProps) {
  // 近1年净值走势
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoff = oneYearAgo.toISOString().split("T")[0];
  const recentTrend = (fund.navTrend ?? []).filter((d) => d.date >= cutoff).slice(-180);

  // 月度收益热力图：取最近 12 个月
  const monthly = (fund.monthlyReturns ?? []).slice(-12);

  // 基金经理
  const managers = fund.managers ?? [];

  // 重仓股 Top5
  const topHoldings = (fund.topHoldings ?? []).slice(0, 5);

  return (
    <ShareCardCanvas theme={theme} generatedAt={generatedAt} subtitle="Fund Analysis">
      {/* 基金标题 */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
            marginBottom: "4px",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 700,
              margin: 0,
              color: "#0f172a",
              letterSpacing: "-0.01em",
            }}
          >
            {fund.name}
          </h2>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "14px",
              color: theme.primary,
              background: withAlpha(theme.primary, 0.08),
              padding: "3px 10px",
              borderRadius: "6px",
            }}
          >
            {fund.code}
          </span>
        </div>
        {fund.index && fund.index !== "—" && (
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>{fund.index}</p>
        )}
      </div>

      {/* 核心四宫格 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <CoreMetric label="最新净值" value={fund.price ? `${fund.price}` : "—"} sub="单位净值" />
        <CoreMetric
          label="近1年收益"
          value={fmtPct(fund.performance.oneYear).text}
          valueColor={fmtPct(fund.performance.oneYear).color}
          sub="阶段涨幅"
        />
        <CoreMetric
          label="最大回撤"
          value={fund.maxDrawdown !== null ? `${fund.maxDrawdown}%` : "—"}
          valueColor="#ef4444"
          sub="历史最大"
        />
        <CoreMetric label="基金规模" value={fund.scale || "—"} sub="管理规模" />
      </div>

      {/* 净值走势 */}
      {recentTrend.length >= 2 && (
        <Section title="近1年净值走势" theme={theme}>
          <MiniTrendChart data={recentTrend} />
        </Section>
      )}

      {/* 全周期收益 */}
      <Section title="全周期收益" theme={theme}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
          }}
        >
          <PerformanceItem label="近1月" value={fund.performance.oneMonth} />
          <PerformanceItem label="近3月" value={fund.performance.threeMonth} />
          <PerformanceItem label="近6月" value={fund.performance.sixMonth} />
          <PerformanceItem label="近1年" value={fund.performance.oneYear} />
          <PerformanceItem label="近3年" value={fund.performance.threeYear} />
          <PerformanceItem label="成立来" value={fund.performance.sinceInception} />
        </div>
      </Section>

      {/* 月度收益热力图 */}
      {monthly.length > 0 && (
        <Section title="月度收益热力图" theme={theme}>
          <MonthlyHeatmap data={monthly} />
        </Section>
      )}

      {/* 基金经理 */}
      {managers.length > 0 && (
        <Section title="基金经理" theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {managers.map((mgr) => (
              <div
                key={mgr.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {mgr.name}
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>
                    任职：{mgr.tenure}
                  </span>
                </div>
                {mgr.tenureReturn !== null && (
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: mgr.tenureReturn >= 0 ? "#ef4444" : "#10b981",
                    }}
                  >
                    任职回报 {mgr.tenureReturn > 0 ? "+" : ""}
                    {mgr.tenureReturn.toFixed(2)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 重仓股 Top5 */}
      {topHoldings.length > 0 && (
        <Section title="重仓股 Top5" theme={theme}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {topHoldings.map((stock, idx) => {
              const change = fmtPct(stock.changePercent);
              return (
                <div
                  key={stock.symbol}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 70px 1fr 80px 80px",
                    gap: "10px",
                    padding: "10px 14px",
                    background: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #f1f5f9",
                    alignItems: "center",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</span>
                  <span style={{ fontFamily: "monospace", color: "#64748b" }}>{stock.symbol}</span>
                  <span
                    style={{
                      color: "#0f172a",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stock.name}
                  </span>
                  <span style={{ textAlign: "right", color: "#475569" }}>
                    {stock.holdingRatio > 0 ? `${stock.holdingRatio.toFixed(2)}%` : "—"}
                  </span>
                  <span
                    style={{
                      textAlign: "right",
                      color: change.color,
                      fontWeight: 600,
                    }}
                  >
                    {change.text}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </ShareCardCanvas>
  );
}

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ModuleTheme;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#0f172a",
          margin: "0 0 12px",
          paddingBottom: "8px",
          borderBottom: `2px solid ${withAlpha(theme.primary, 0.18)}`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{ width: "4px", height: "16px", background: theme.primary, borderRadius: "2px" }}
        />
        {title}
      </h3>
      {children}
    </div>
  );
}

function CoreMetric({
  label,
  value,
  valueColor = "#0f172a",
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "14px 10px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: valueColor, marginBottom: "2px" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}

function PerformanceItem({ label, value }: { label: string; value: number | null }) {
  const v = fmtPct(value);
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "10px",
        padding: "12px 8px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: v.color }}>{v.text}</div>
    </div>
  );
}

/** 月度收益热力图：横向排列 12 个月 */
function MonthlyHeatmap({
  data,
}: {
  data: Array<{ year: number; month: number; returnRate: number }>;
}) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.returnRate)), 1);

  const getColor = (rate: number) => {
    if (rate === 0) return "#f8fafc";
    const intensity = Math.min(Math.abs(rate) / maxAbs, 1);
    if (rate > 0) {
      // 绿色（正收益）
      const alpha = 0.2 + intensity * 0.8;
      return `rgba(16, 185, 129, ${alpha})`;
    } else {
      // 红色（负收益）
      const alpha = 0.2 + intensity * 0.8;
      return `rgba(239, 68, 68, ${alpha})`;
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(data.length, 6)}, 1fr)`,
        gap: "8px",
      }}
    >
      {data.map((d) => (
        <div
          key={`${d.year}-${d.month}`}
          style={{
            background: getColor(d.returnRate),
            borderRadius: "8px",
            padding: "12px 8px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>
            {d.year}-{String(d.month).padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: d.returnRate > 0 ? "#065f46" : d.returnRate < 0 ? "#991b1b" : "#475569",
            }}
          >
            {d.returnRate > 0 ? "+" : ""}
            {d.returnRate.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
}

/** 迷你净值走势 SVG */
function MiniTrendChart({ data }: { data: Array<{ date: string; nav: number }> }) {
  const width = 1000;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 28, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const navs = data.map((d) => d.nav);
  const minNav = Math.min(...navs);
  const maxNav = Math.max(...navs);
  const range = maxNav - minNav || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.nav - minNav) / range) * chartH;
    return { x, y, ...d };
  });

  const pathD = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const areaD = `${pathD} L${padding.left + chartW},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  const isUp = navs[navs.length - 1] >= navs[0];
  const lineColor = isUp ? "#ef4444" : "#10b981";
  const fillColor = isUp ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)";

  const yTicks = Array.from({ length: 3 }, (_, i) => {
    const val = minNav + (range * i) / 2;
    const y = padding.top + chartH - ((val - minNav) / range) * chartH;
    return { val: val.toFixed(3), y };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={t.y}
            x2={padding.left + chartW}
            y2={t.y}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <text x={padding.left - 8} y={t.y + 4} textAnchor="end" fill="#94a3b8" fontSize={11}>
            {t.val}
          </text>
        </g>
      ))}
      <path d={areaD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" />
      <text x={padding.left} y={height - 6} fill="#94a3b8" fontSize={11}>
        {data[0].date.slice(5)}
      </text>
      <text x={padding.left + chartW} y={height - 6} textAnchor="end" fill="#94a3b8" fontSize={11}>
        {data[data.length - 1].date.slice(5)}
      </text>
      <text
        x={padding.left + chartW - 8}
        y={padding.top + 14}
        textAnchor="end"
        fill={lineColor}
        fontSize={13}
        fontWeight={700}
      >
        {isUp ? "+" : ""}
        {(((navs[navs.length - 1] - navs[0]) / navs[0]) * 100).toFixed(2)}%
      </text>
    </svg>
  );
}
