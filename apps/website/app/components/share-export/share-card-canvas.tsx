/**
 * 导出卡片统一画布
 *
 * 所有模块的专用模板都通过此画布包装，保证：
 * - 3:4 竖版（1080 × 1440 基准，允许纵向自适应）
 * - 顶部品牌 Header（ETFVoid Logo + 模块标题 + 副标题 + 主色渐变）
 * - 底部 Footer（生成时间 / 数据来源 / 免责声明）
 * - 整体白底卡片化，便于在社交平台分享
 */
import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import type { ModuleTheme, IconComponent } from "./types";
import { withAlpha } from "./module-theme";

interface ShareCardCanvasProps {
  theme: ModuleTheme;
  /** 模块对应的图标（覆盖主题默认图标） */
  Icon?: IconComponent;
  /** 卡片副标题，默认取 theme.subtitle */
  subtitle?: string;
  /** 生成时间 ISO 字符串 */
  generatedAt: string;
  /** 数据来源（默认取 theme.source） */
  source?: string;
  /** 主体内容 */
  children: ReactNode;
}

/** 固定卡片宽度：1080px，3:4 比例基准 */
export const CARD_WIDTH = 1080;

/** 把 ISO 时间格式化为 YYYY-MM-DD HH:mm */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export function ShareCardCanvas({
  theme,
  Icon,
  subtitle,
  generatedAt,
  source,
  children,
}: ShareCardCanvasProps) {
  const ModuleIcon = Icon ?? theme.Icon;
  const finalSubtitle = subtitle ?? theme.subtitle;
  const finalSource = source ?? theme.source;

  return (
    <div
      // 卡片根容器：固定宽度，白底，圆角，立体阴影
      style={{
        width: `${CARD_WIDTH}px`,
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: '"Noto Serif Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
      }}
    >
      {/* 顶部品牌 + 模块 Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.gradientEnd} 100%)`,
          color: "#ffffff",
          padding: "36px 40px 32px",
          position: "relative",
        }}
      >
        {/* 顶部品牌行 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BarChart3 style={{ width: "28px", height: "28px" }} />
            <span style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "0.02em" }}>
              ETFVoid
            </span>
          </div>
          <span
            style={{
              fontSize: "14px",
              opacity: 0.85,
              background: "rgba(255,255,255,0.18)",
              padding: "4px 12px",
              borderRadius: "999px",
            }}
          >
            {finalSubtitle}
          </span>
        </div>

        {/* 模块标题 + 图标 */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ModuleIcon style={{ width: "32px", height: "32px" }} />
          </div>
          <h1
            style={{
              fontSize: "40px",
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {theme.title}
          </h1>
        </div>
      </header>

      {/* 主体内容区：浅色背景，留出 padding */}
      <main style={{ padding: "32px 40px", background: "#f8fafc" }}>{children}</main>

      {/* 底部 Footer */}
      <footer
        style={{
          padding: "24px 40px 28px",
          background: "#ffffff",
          borderTop: `1px solid ${withAlpha(theme.primary, 0.15)}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "14px", color: "#475569" }}>
            生成时间 · {formatTime(generatedAt)}
          </span>
          <span
            style={{
              fontSize: "12px",
              background: withAlpha(theme.primary, 0.08),
              padding: "4px 10px",
              borderRadius: "999px",
              color: theme.primary,
            }}
          >
            {finalSource}
          </span>
        </div>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
          数据仅供参考，不构成投资建议。申购状态实时变化，请以基金公司公告为准。
        </p>
      </footer>
    </div>
  );
}
