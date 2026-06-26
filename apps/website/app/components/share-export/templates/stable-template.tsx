/**
 * 稳健收益导出模板
 *
 * 适用模块：stable（/stable）
 *
 * 布局：
 * - 顶部：中美对比 + 总数统计
 * - 卡片网格：按市场分组（中国 / 全球 / 美国），每张卡含
 *   年化收益 / 最大回撤 / 成立年限 / 评级 / 申购门槛
 * - 色调：金棕主色，呼应"稳健"
 */
import type { ModuleTheme, StableProductExport } from "../types";
import { ShareCardCanvas } from "../share-card-canvas";
import { withAlpha } from "../module-theme";

interface StableTemplateProps {
  theme: ModuleTheme;
  products: StableProductExport[];
  generatedAt: string;
}

const MARKET_LABEL: Record<StableProductExport["marketTag"], string> = {
  cn: "中国",
  global: "全球",
  us: "美国",
};

export function StableTemplate({ theme, products, generatedAt }: StableTemplateProps) {
  const grouped: Record<StableProductExport["marketTag"], StableProductExport[]> = {
    cn: [],
    global: [],
    us: [],
  };
  for (const p of products) grouped[p.marketTag].push(p);

  const avgYield =
    products.length > 0 ? products.reduce((s, p) => s + p.annualYield, 0) / products.length : 0;
  const avgDrawdown =
    products.length > 0 ? products.reduce((s, p) => s + p.maxDrawdown, 0) / products.length : 0;

  return (
    <ShareCardCanvas theme={theme} generatedAt={generatedAt} subtitle="Stable Yield Products">
      {/* 顶部统计 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <StatBox label="产品总数" value={`${products.length}`} color={theme.primary} />
        <StatBox label="平均年化" value={`${avgYield.toFixed(2)}%`} color="#d97706" />
        <StatBox label="平均最大回撤" value={`${avgDrawdown.toFixed(2)}%`} color="#ef4444" />
      </div>

      {/* 按市场分组展示 */}
      {(["cn", "global", "us"] as const).map((market) => {
        const items = grouped[market];
        if (items.length === 0) return null;
        return (
          <div key={market} style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "4px",
                  height: "16px",
                  background: theme.primary,
                  borderRadius: "2px",
                }}
              />
              {MARKET_LABEL[market]}市场 · {items.length} 只
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {items.map((p) => (
                <StableCard key={p.name} product={p} theme={theme} />
              ))}
            </div>
          </div>
        );
      })}
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
      <div style={{ fontSize: "22px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function StableCard({ product, theme }: { product: StableProductExport; theme: ModuleTheme }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "14px 16px",
        border: `1px solid ${withAlpha(theme.primary, 0.12)}`,
        borderLeft: `4px solid ${theme.primary}`,
      }}
    >
      {/* 顶部：名称 + 评级 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>
            {product.type} · {product.market}
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#0f172a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.name}
          </div>
        </div>
        {product.rating && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#d97706",
              background: "#fef3c7",
              padding: "4px 10px",
              borderRadius: "8px",
              flexShrink: 0,
            }}
          >
            {product.rating}
          </span>
        )}
      </div>

      {/* 关键指标 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          fontSize: "12px",
        }}
      >
        <Metric label="年化收益" value={`${product.annualYield.toFixed(2)}%`} color="#d97706" />
        <Metric label="最大回撤" value={`${product.maxDrawdown.toFixed(2)}%`} color="#ef4444" />
        <Metric label="成立年限" value={`${product.years}年`} color="#475569" />
        <Metric label="申购门槛" value={product.entry} color="#475569" />
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
