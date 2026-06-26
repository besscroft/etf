/**
 * 基金列表导出模板
 *
 * 适用模块：nasdaq / sp500 / active / qdii
 *
 * 布局：
 * - 顶部统计卡（基金数 / 开放申购数 / 暂停数 / 更新时间）
 * - 列表表格：代码 / 名称 / 规模 / 近1年 / 昨日涨跌 / 申购状态
 * - 取前 20 条展示，避免单图过长
 */
import type { OTCFundData, QDIIFundData } from "~/lib/market-data";
import type { ModuleTheme } from "../types";
import { ShareCardCanvas } from "../share-card-canvas";
import { withAlpha } from "../module-theme";

interface FundListTemplateProps {
  theme: ModuleTheme;
  moduleTitle: string;
  fetchedAt: string;
  generatedAt: string;
  funds: OTCFundData[] | QDIIFundData[];
  filterLabel?: string;
  /** 是否带分类标签（QDII 模块为 true） */
  showCategory?: boolean;
}

type AnyFund = OTCFundData | QDIIFundData;

function isQDII(f: AnyFund): f is QDIIFundData {
  return (f as QDIIFundData).categoryLabel !== undefined;
}

function formatChange(value: number | null): { text: string; color: string } {
  if (value === null) return { text: "—", color: "#94a3b8" };
  const sign = value > 0 ? "+" : "";
  const color = value > 0 ? "#ef4444" : value < 0 ? "#10b981" : "#475569";
  return { text: `${sign}${value.toFixed(2)}%`, color };
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export function FundListTemplate({
  theme,
  moduleTitle,
  fetchedAt,
  generatedAt,
  funds,
  filterLabel,
  showCategory = false,
}: FundListTemplateProps) {
  // 取前 20 条，避免图片过长
  const display = funds.slice(0, 20);
  const openCount = funds.filter((f) => f.purchaseStatus !== "暂停").length;
  const suspendedCount = funds.length - openCount;

  // 计算平均收益（仅统计有数据的）
  const returns = funds.map((f) => f.returnOneYear).filter((v): v is number => v !== null);
  const avgReturn = returns.length > 0 ? returns.reduce((s, v) => s + v, 0) / returns.length : null;

  return (
    <ShareCardCanvas theme={theme} generatedAt={generatedAt} subtitle={moduleTitle}>
      {/* 顶部统计四宫格 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <StatBox label="基金数量" value={`${funds.length}`} color={theme.primary} />
        <StatBox label="开放申购" value={`${openCount}`} color="#10b981" />
        <StatBox label="暂停申购" value={`${suspendedCount}`} color="#ef4444" />
        <StatBox
          label="近1年均值"
          value={avgReturn !== null ? `${avgReturn.toFixed(2)}%` : "—"}
          color={avgReturn !== null && avgReturn >= 0 ? "#ef4444" : "#10b981"}
        />
      </div>

      {/* 筛选状态 + 更新时间 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          fontSize: "14px",
          color: "#64748b",
        }}
      >
        <span>
          {filterLabel ? `筛选：${filterLabel} · ` : ""}
          展示前 {display.length} 条
        </span>
        <span>行情更新：{formatTime(fetchedAt)}</span>
      </div>

      {/* 表格 */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          border: `1px solid ${withAlpha(theme.primary, 0.12)}`,
        }}
      >
        {/* 表头 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showCategory
              ? "90px 1fr 90px 100px 110px 90px"
              : "90px 1fr 100px 110px 90px",
            background: withAlpha(theme.primary, 0.06),
            padding: "12px 16px",
            fontSize: "13px",
            color: theme.primary,
            fontWeight: 600,
          }}
        >
          <span>代码</span>
          <span>基金名称</span>
          {showCategory && <span>类型</span>}
          <span style={{ textAlign: "right" }}>规模(亿)</span>
          <span style={{ textAlign: "right" }}>近1年</span>
          <span style={{ textAlign: "right" }}>状态</span>
        </div>

        {/* 表体 */}
        {display.map((fund, idx) => (
          <FundRow
            key={fund.code}
            fund={fund}
            showCategory={showCategory}
            isLast={idx === display.length - 1}
          />
        ))}
      </div>

      {funds.length > 20 && (
        <p style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", marginTop: "16px" }}>
          仅展示前 20 条，共 {funds.length} 只基金
        </p>
      )}
    </ShareCardCanvas>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
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
      <div style={{ fontSize: "24px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function FundRow({
  fund,
  showCategory,
  isLast,
}: {
  fund: AnyFund;
  showCategory: boolean;
  isLast: boolean;
}) {
  const isSuspended = fund.purchaseStatus === "暂停";
  const ret = formatChange(fund.returnOneYear);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: showCategory
          ? "90px 1fr 90px 100px 110px 90px"
          : "90px 1fr 100px 110px 90px",
        padding: "12px 16px",
        fontSize: "14px",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
        opacity: isSuspended ? 0.6 : 1,
        alignItems: "center",
      }}
    >
      <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#64748b" }}>
        {fund.code}
      </span>
      <span
        style={{
          fontWeight: 500,
          color: "#0f172a",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {fund.name}
      </span>
      {showCategory && isQDII(fund) && (
        <span style={{ fontSize: "12px", color: "#64748b" }}>{fund.categoryLabel}</span>
      )}
      <span style={{ textAlign: "right", color: "#475569" }}>
        {fund.scale > 0 ? fund.scale.toFixed(1) : "—"}
      </span>
      <span style={{ textAlign: "right", color: ret.color, fontWeight: 600 }}>{ret.text}</span>
      <span style={{ textAlign: "right" }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 500,
            background: isSuspended ? "#fee2e2" : "#dcfce7",
            color: isSuspended ? "#dc2626" : "#16a34a",
          }}
        >
          {isSuspended ? "暂停" : "开放"}
        </span>
      </span>
    </div>
  );
}
