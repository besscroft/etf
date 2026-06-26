/**
 * 基金对比导出模板
 *
 * 适用模块：fund-compare（/compare）
 *
 * 布局：
 * - 顶部基金名称横列（最多4只）
 * - 核心指标对比表：最新净值 / 近1年 / 近3年 / 最大回撤 / 规模 / 费率
 * - 阶段涨幅对比：4周期横向柱状图
 * - 重仓股重叠度提示
 */
import type { FundDetailData } from "~/lib/market-data";
import type { ModuleTheme } from "../types";
import { ShareCardCanvas } from "../share-card-canvas";
import { withAlpha } from "../module-theme";

interface FundCompareTemplateProps {
  theme: ModuleTheme;
  funds: Array<FundDetailData & { error?: string }>;
  generatedAt: string;
}

const COMPARE_PALETTE = [
  { bg: "#3b82f6", text: "#ffffff", name: "蓝" },
  { bg: "#ef4444", text: "#ffffff", name: "红" },
  { bg: "#10b981", text: "#ffffff", name: "绿" },
  { bg: "#f59e0b", text: "#ffffff", name: "橙" },
];

function fmtPct(v: number | null): { text: string; color: string } {
  if (v === null) return { text: "—", color: "#94a3b8" };
  const sign = v > 0 ? "+" : "";
  const color = v > 0 ? "#ef4444" : v < 0 ? "#10b981" : "#475569";
  return { text: `${sign}${v.toFixed(2)}%`, color };
}

export function FundCompareTemplate({ theme, funds, generatedAt }: FundCompareTemplateProps) {
  // 仅取有效基金（无 error）
  const validFunds = funds.filter((f) => !f.error).slice(0, 4);

  // 重仓股重叠度
  const allHoldings = validFunds.map((f) => new Set((f.topHoldings ?? []).map((h) => h.symbol)));
  const overlap =
    allHoldings.length >= 2
      ? Array.from(allHoldings[0]).filter((s) => allHoldings.slice(1).every((set) => set.has(s)))
          .length
      : null;

  return (
    <ShareCardCanvas theme={theme} generatedAt={generatedAt} subtitle="Fund Comparison">
      {/* 顶部基金头部 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(validFunds.length, 1)}, 1fr)`,
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {validFunds.map((fund, idx) => {
          const color = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
          return (
            <div
              key={fund.code}
              style={{
                background: `linear-gradient(135deg, ${color.bg}, ${color.bg}dd)`,
                color: color.text,
                borderRadius: "14px",
                padding: "16px 14px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  opacity: 0.85,
                  marginBottom: "4px",
                  background: "rgba(255,255,255,0.2)",
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                {color.name}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  lineHeight: 1.3,
                  marginBottom: "6px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {fund.name}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.85, fontFamily: "monospace" }}>
                {fund.code}
              </div>
            </div>
          );
        })}
      </div>

      {/* 核心指标对比表 */}
      <Section title="核心指标对比" theme={theme}>
        <ComparisonTable funds={validFunds} />
      </Section>

      {/* 阶段涨幅柱状图 */}
      <Section title="阶段涨幅对比" theme={theme}>
        <BarComparison funds={validFunds} />
      </Section>

      {/* 重仓股重叠度 */}
      {overlap !== null && validFunds.length >= 2 && (
        <div
          style={{
            marginTop: "16px",
            padding: "16px 20px",
            background: withAlpha(theme.primary, 0.05),
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: theme.primary,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {overlap}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
              重仓股重叠度：{overlap} 只
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              {validFunds.length} 只基金共同持有的重仓股数量
            </div>
          </div>
        </div>
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

function ComparisonTable({ funds }: { funds: Array<FundDetailData> }) {
  const rows = [
    { label: "最新净值", render: (f: FundDetailData) => (f.price ? `${f.price}` : "—") },
    {
      label: "昨日涨跌",
      render: (f: FundDetailData) => {
        const v = fmtPct(f.changePercent);
        return <span style={{ color: v.color, fontWeight: 600 }}>{v.text}</span>;
      },
    },
    {
      label: "近1月",
      render: (f: FundDetailData) => {
        const v = fmtPct(f.performance.oneMonth);
        return <span style={{ color: v.color }}>{v.text}</span>;
      },
    },
    {
      label: "近1年",
      render: (f: FundDetailData) => {
        const v = fmtPct(f.performance.oneYear);
        return <span style={{ color: v.color, fontWeight: 600 }}>{v.text}</span>;
      },
    },
    {
      label: "近3年",
      render: (f: FundDetailData) => {
        const v = fmtPct(f.performance.threeYear);
        return <span style={{ color: v.color }}>{v.text}</span>;
      },
    },
    {
      label: "最大回撤",
      render: (f: FundDetailData) => (
        <span style={{ color: "#ef4444" }}>
          {f.maxDrawdown !== null ? `${f.maxDrawdown}%` : "—"}
        </span>
      ),
    },
    { label: "基金规模", render: (f: FundDetailData) => f.scale || "—" },
    {
      label: "管理费率",
      render: (f: FundDetailData) => f.manageRate || f.fee || "—",
    },
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      {rows.map((row, idx) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: `120px repeat(${funds.length}, 1fr)`,
            padding: "12px 16px",
            borderBottom: idx === rows.length - 1 ? "none" : "1px solid #f1f5f9",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px", color: "#64748b" }}>{row.label}</span>
          {funds.map((f) => (
            <span key={f.code} style={{ textAlign: "center", fontSize: "14px", color: "#0f172a" }}>
              {row.render(f)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 阶段涨幅柱状对比：归一化每只基金在四个周期内的相对位置 */
function BarComparison({ funds }: { funds: Array<FundDetailData> }) {
  const periods = [
    { label: "近1月", key: "oneMonth" as const },
    { label: "近3月", key: "threeMonth" as const },
    { label: "近6月", key: "sixMonth" as const },
    { label: "近1年", key: "oneYear" as const },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {periods.map((p) => {
        const values = funds.map((f) => f.performance[p.key]);
        const validValues = values.filter((v): v is number => v !== null);
        const max = validValues.length > 0 ? Math.max(...validValues.map(Math.abs)) : 0;

        return (
          <div key={p.key}>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>{p.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {funds.map((f, idx) => {
                const v = f.performance[p.key];
                const pct = v !== null && max > 0 ? Math.abs(v) / max : 0;
                const color = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
                const isPositive = v !== null && v >= 0;
                const valueColor = v === null ? "#94a3b8" : isPositive ? "#ef4444" : "#10b981";

                return (
                  <div key={f.code} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: color.bg,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        height: "20px",
                        background: "#f1f5f9",
                        borderRadius: "4px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${pct * 100}%`,
                          background: color.bg,
                          opacity: 0.85,
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: "80px",
                        textAlign: "right",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: valueColor,
                        fontFamily: "monospace",
                      }}
                    >
                      {v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
