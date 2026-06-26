/**
 * 基金详情导出模板
 *
 * 适用模块：fund-detail（/fund/:code）
 *
 * 布局：
 * - 基金标题 + 代码徽章
 * - 核心四宫格：最新净值 / 涨跌幅 / 近1年 / 规模
 * - 业绩走势迷你 SVG（近1年）
 * - 阶段涨幅（4列）
 * - 重仓股 Top10 列表
 */
import type { FundDetailData } from "~/lib/market-data";
import type { ModuleTheme } from "../types";
import { ShareCardCanvas } from "../share-card-canvas";
import { withAlpha } from "../module-theme";

interface FundDetailTemplateProps {
  theme: ModuleTheme;
  fund: FundDetailData;
  generatedAt: string;
}

function fmtPct(v: number | null, withSign = true): { text: string; color: string } {
  if (v === null) return { text: "—", color: "#94a3b8" };
  const sign = withSign && v > 0 ? "+" : "";
  const color = v > 0 ? "#ef4444" : v < 0 ? "#10b981" : "#475569";
  return { text: `${sign}${v.toFixed(2)}%`, color };
}

export function FundDetailTemplate({ theme, fund, generatedAt }: FundDetailTemplateProps) {
  // 取近1年净值数据用于迷你走势图
  const trendData = fund.navTrend ?? [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoff = oneYearAgo.toISOString().split("T")[0];
  const recentTrend = trendData.filter((d) => d.date >= cutoff).slice(-180);

  // 重仓股取前 10
  const topHoldings = (fund.topHoldings ?? []).slice(0, 10);

  return (
    <ShareCardCanvas theme={theme} generatedAt={generatedAt} subtitle="Fund Detail">
      {/* 基金标题区 */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
            marginBottom: "8px",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontSize: "32px",
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
              fontSize: "16px",
              color: theme.primary,
              background: withAlpha(theme.primary, 0.08),
              padding: "4px 12px",
              borderRadius: "8px",
            }}
          >
            {fund.code}
          </span>
        </div>
        {fund.index && (
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>跟踪指数：{fund.index}</p>
        )}
      </div>

      {/* 核心四宫格 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <CoreMetric label="最新净值" value={fund.price ? `${fund.price}` : "—"} sub="单位净值" />
        <CoreMetric
          label="昨日涨跌"
          value={fmtPct(fund.changePercent).text}
          valueColor={fmtPct(fund.changePercent).color}
          sub="最新交易日"
        />
        <CoreMetric
          label="近1年收益"
          value={fmtPct(fund.performance.oneYear).text}
          valueColor={fmtPct(fund.performance.oneYear).color}
          sub="阶段涨幅"
        />
        <CoreMetric label="基金规模" value={fund.scale || "—"} sub="管理规模" />
      </div>

      {/* 净值走势迷你图 */}
      {recentTrend.length >= 2 && (
        <Section title="近1年净值走势" theme={theme}>
          <MiniTrendChart data={recentTrend} theme={theme} />
        </Section>
      )}

      {/* 阶段涨幅 */}
      <Section title="阶段涨幅" theme={theme}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <PerformanceItem label="近1月" value={fund.performance.oneMonth} />
          <PerformanceItem label="近3月" value={fund.performance.threeMonth} />
          <PerformanceItem label="近6月" value={fund.performance.sixMonth} />
          <PerformanceItem label="近1年" value={fund.performance.oneYear} />
        </div>
      </Section>

      {/* 重仓股 */}
      {topHoldings.length > 0 && (
        <Section title="重仓股 Top10" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1fr 90px 90px",
              gap: "8px 12px",
              fontSize: "13px",
            }}
          >
            {topHoldings.map((stock, idx) => {
              const change = fmtPct(stock.changePercent);
              return (
                <FragmentRow key={stock.symbol} idx={idx}>
                  <span style={{ fontFamily: "monospace", color: "#64748b" }}>{stock.symbol}</span>
                  <span
                    style={{
                      color: "#0f172a",
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
                  <span style={{ textAlign: "right", color: change.color, fontWeight: 600 }}>
                    {change.text}
                  </span>
                </FragmentRow>
              );
            })}
          </div>
        </Section>
      )}

      {/* 费率信息条 */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginTop: "24px",
          padding: "16px 20px",
          background: "#ffffff",
          borderRadius: "12px",
          border: `1px solid ${withAlpha(theme.primary, 0.12)}`,
          fontSize: "13px",
          color: "#475569",
          flexWrap: "wrap",
        }}
      >
        <span>
          管理费率：<strong style={{ color: "#0f172a" }}>{fund.manageRate || "—"}</strong>
        </span>
        <span>
          申购费率：
          <strong style={{ color: "#0f172a" }}>{fund.sourceRate || fund.fee || "—"}</strong>
        </span>
        <span>
          最大回撤：
          <strong style={{ color: "#ef4444" }}>
            {fund.maxDrawdown !== null ? `${fund.maxDrawdown}%` : "—"}
          </strong>
        </span>
        {fund.premium !== 0 && (
          <span>
            溢价率：
            <strong style={{ color: fund.premium > 0 ? "#ef4444" : "#10b981" }}>
              {fund.premium > 0 ? "+" : ""}
              {fund.premium}%
            </strong>
          </span>
        )}
      </div>
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
    <div style={{ marginBottom: "24px" }}>
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
        padding: "16px 12px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: valueColor, marginBottom: "4px" }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{sub}</div>
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
        padding: "14px 8px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: v.color }}>{v.text}</div>
    </div>
  );
}

/** 走势图：用 CSS Grid 模拟每行的边框 */
function FragmentRow({ idx, children }: { idx: number; children: React.ReactNode }) {
  return (
    <>
      <div
        style={{
          gridColumn: "1 / -1",
          borderTop: idx === 0 ? "1px solid #e2e8f0" : "1px solid #f1f5f9",
          height: 0,
        }}
      />
      {children}
      <div
        style={{
          gridColumn: "1 / -1",
          borderBottom: "1px solid #f1f5f9",
          height: 0,
        }}
      />
    </>
  );
}

/** 迷你净值走势 SVG */
function MiniTrendChart({
  data,
  theme,
}: {
  data: Array<{ date: string; nav: number }>;
  theme: ModuleTheme;
}) {
  if (data.length < 2) {
    return <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>数据不足</div>;
  }

  const width = 1000;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 50 };
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
      {/* Y轴刻度 + 网格 */}
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

      {/* 区域填充 */}
      <path d={areaD} fill={fillColor} />
      {/* 折线 */}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" />

      {/* X 轴端点日期 */}
      <text x={padding.left} y={height - 8} fill="#94a3b8" fontSize={11}>
        {data[0].date.slice(5)}
      </text>
      <text x={padding.left + chartW} y={height - 8} textAnchor="end" fill="#94a3b8" fontSize={11}>
        {data[data.length - 1].date.slice(5)}
      </text>

      {/* 涨跌幅标签 */}
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
