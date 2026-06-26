/**
 * QDII 估值导出模板
 *
 * 适用模块：valuation（/qdii-valuation）
 *
 * 布局：
 * - 顶部状态条：市场时段 + 估值时间 + 总数
 * - 分类标签筛选提示
 * - 估值卡片网格：每只基金一张卡，含估算净值/估算涨跌/实际净值/偏差
 * - 卡片颜色根据涨跌动态着色
 */
import type { QDIIValuationData, MarketSession } from "~/lib/market-data";
import type { ModuleTheme } from "../types";
import { ShareCardCanvas } from "../share-card-canvas";
import { withAlpha } from "../module-theme";

interface ValuationTemplateProps {
  theme: ModuleTheme;
  funds: QDIIValuationData[];
  session: MarketSession;
  fetchedAt: string;
  generatedAt: string;
}

const SESSION_LABEL: Record<MarketSession, string> = {
  pre: "盘前",
  intraday: "盘中",
  after: "盘后",
};

const SESSION_COLOR: Record<MarketSession, string> = {
  pre: "#f59e0b",
  intraday: "#10b981",
  after: "#64748b",
};

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export function ValuationTemplate({
  theme,
  funds,
  session,
  fetchedAt,
  generatedAt,
}: ValuationTemplateProps) {
  // 取前 16 条，按估算涨幅降序
  const sorted = [...funds].sort((a, b) => b.estimatedChange - a.estimatedChange);
  const display = sorted.slice(0, 16);

  // 统计
  const upCount = funds.filter((f) => f.estimatedChange > 0).length;
  const downCount = funds.filter((f) => f.estimatedChange < 0).length;

  return (
    <ShareCardCanvas theme={theme} generatedAt={generatedAt} subtitle="Real-time Valuation">
      {/* 顶部状态条 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
          background: "#ffffff",
          borderRadius: "12px",
          marginBottom: "20px",
          border: `1px solid ${withAlpha(theme.primary, 0.12)}`,
          fontSize: "14px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: withAlpha(SESSION_COLOR[session], 0.12),
            color: SESSION_COLOR[session],
            padding: "4px 12px",
            borderRadius: "999px",
            fontWeight: 600,
            fontSize: "13px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: SESSION_COLOR[session],
            }}
          />
          {SESSION_LABEL[session]}
        </span>
        <span style={{ color: "#475569" }}>估值时间：{fmtTime(fetchedAt)}</span>
        <span style={{ marginLeft: "auto", color: "#475569" }}>
          涨 <strong style={{ color: "#ef4444" }}>{upCount}</strong> · 跌{" "}
          <strong style={{ color: "#10b981" }}>{downCount}</strong> · 共{" "}
          <strong style={{ color: theme.primary }}>{funds.length}</strong>
        </span>
      </div>

      {/* 估值卡片网格：2 列 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
        }}
      >
        {display.map((fund) => (
          <ValuationCard key={fund.code} fund={fund} theme={theme} />
        ))}
      </div>

      {funds.length > 16 && (
        <p style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", marginTop: "16px" }}>
          仅展示前 16 条（按估算涨幅降序），共 {funds.length} 只
        </p>
      )}
    </ShareCardCanvas>
  );
}

function ValuationCard({ fund, theme }: { fund: QDIIValuationData; theme: ModuleTheme }) {
  const isUp = fund.estimatedChange > 0;
  const isDown = fund.estimatedChange < 0;
  const accentColor = isUp ? "#ef4444" : isDown ? "#10b981" : "#64748b";

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "14px 16px",
        border: `1px solid ${withAlpha(accentColor, 0.2)}`,
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {/* 顶部：代码 + 名称 + 分类标签 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px",
          gap: "8px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>
              {fund.code}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: theme.primary,
                background: withAlpha(theme.primary, 0.08),
                padding: "1px 6px",
                borderRadius: "4px",
              }}
            >
              {fund.categoryLabel}
            </span>
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#0f172a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fund.name}
          </div>
        </div>
      </div>

      {/* 估算净值 + 估算涨跌 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "22px", fontWeight: 700, color: accentColor }}>
          {fund.estimatedNav.toFixed(4)}
        </span>
        <span style={{ fontSize: "14px", fontWeight: 600, color: accentColor }}>
          {isUp ? "+" : ""}
          {fund.estimatedChange.toFixed(2)}%
        </span>
      </div>

      {/* 底部：实际净值 + 偏差 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#64748b",
          borderTop: "1px dashed #e2e8f0",
          paddingTop: "8px",
        }}
      >
        <span>
          实际净值：<strong style={{ color: "#0f172a" }}>{fund.actualNav ?? "—"}</strong>
          {fund.navDate && <span style={{ marginLeft: "4px" }}>({fund.navDate})</span>}
        </span>
        {fund.deviation !== null && (
          <span>
            偏差：
            <strong style={{ color: Math.abs(fund.deviation) > 1 ? "#ef4444" : "#475569" }}>
              {fund.deviation > 0 ? "+" : ""}
              {fund.deviation.toFixed(2)}%
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}
