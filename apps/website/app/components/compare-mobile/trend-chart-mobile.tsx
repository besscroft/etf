/**
 * TrendChartMobile 移动端净值走势对比图
 *
 * 在桌面端 OverlayChart 基础上适配触屏：
 * - onTouchStart/Move 替代 onPointerMove，按住显示十字线 + tooltip
 * - 外层包 touch-none，阻止页面滚动冲突
 * - 采样数降至 80（移动端渲染性能优化）
 * - 时间范围选择器横向滚动
 *
 * 关键逻辑沿用桌面端：归一化（起始点=100）+ 全局 Y 范围
 */
import { useState, useMemo, useRef, type TouchEvent } from "react";
import { motion } from "motion/react";
import { LineChart } from "lucide-react";
import type { FundDetailData } from "~/lib/market-data";
import { getCompareColor } from "./constants";

type RangeKey = "3m" | "6m" | "1y" | "all";

const RANGES: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "3m", label: "近3月", days: 90 },
  { key: "6m", label: "近6月", days: 180 },
  { key: "1y", label: "近1年", days: 365 },
  { key: "all", label: "全部", days: Number.POSITIVE_INFINITY },
];

const SAMPLING_MAX = 80; // 移动端采样上限

interface TrendChartMobileProps {
  funds: Array<FundDetailData & { error?: string }>;
}

export function TrendChartMobile({ funds }: TrendChartMobileProps) {
  const [range, setRange] = useState<RangeKey>("1y");

  const fundsWithData = useMemo(
    () => funds.filter((f) => f.navTrend && f.navTrend.length >= 2),
    [funds],
  );

  if (fundsWithData.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <LineChart className="size-4 text-blue-500" />
          净值走势对比
        </div>
        <p className="py-8 text-center text-sm text-muted-foreground">暂无净值走势数据</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <LineChart className="size-4 text-blue-500" />
        净值走势对比
      </div>
      <p className="mb-2 text-xs text-muted-foreground">归一化净值（起始点=100）</p>

      {/* 时间范围 - 横向滚动 */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              range === r.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <OverlayChartMobile funds={fundsWithData} range={range} />
    </div>
  );
}

function OverlayChartMobile({
  funds,
  range,
}: {
  funds: Array<FundDetailData & { error?: string }>;
  range: RangeKey;
}) {
  const [touchX, setTouchX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);

  const days = RANGES.find((r) => r.key === range)?.days ?? 365;

  // 过滤 + 归一化 + 采样
  const seriesData = useMemo(() => {
    return funds.map((fund) => {
      let data = fund.navTrend;
      if (days !== Number.POSITIVE_INFINITY) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        data = data.filter((d) => d.date >= cutoffStr);
      }
      if (data.length < 2) return { fund, points: [] as Array<{ date: string; value: number }> };

      const base = data[0].nav;
      const points = data.map((d) => ({
        date: d.date,
        value: base > 0 ? (d.nav / base) * 100 : 100,
      }));

      // 采样（移动端降至 80 点）
      const sampled =
        points.length > SAMPLING_MAX
          ? points.filter(
              (_, i) =>
                i % Math.ceil(points.length / SAMPLING_MAX) === 0 || i === points.length - 1,
            )
          : points;

      return { fund, points: sampled };
    });
  }, [funds, days]);

  const allValues = seriesData.flatMap((s) => s.points.map((p) => p.value));
  if (allValues.length < 2) {
    return <p className="py-6 text-center text-sm text-muted-foreground">数据不足</p>;
  }

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const valRange = maxVal - minVal || 1;

  const width = 320;
  const height = 200;
  const padding = { top: 10, right: 8, bottom: 24, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allDates = seriesData.flatMap((s) => s.points.map((p) => p.date)).sort();
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const dateRange =
    minDate && maxDate ? new Date(maxDate).getTime() - new Date(minDate).getTime() : 1;

  // Y 轴刻度（3 档）
  const yTicks = Array.from({ length: 3 }, (_, i) => {
    const val = minVal + (valRange * i) / 2;
    const y = padding.top + chartH - ((val - minVal) / valRange) * chartH;
    return { val: val.toFixed(1), y };
  });

  const firstDate = minDate?.slice(2) ?? "";
  const lastDate = maxDate?.slice(2) ?? "";
  const midIdx = Math.floor((seriesData[0]?.points.length ?? 0) / 2);
  const midDate = seriesData[0]?.points[midIdx]?.date?.slice(2) ?? "";

  // 触摸事件：节流到一帧
  const handleTouch = (e: TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const svg = svgRef.current;
    if (!svg) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = svg.getBoundingClientRect();
      const scaleX = width / rect.width;
      setTouchX((touch.clientX - rect.left) * scaleX);
    });
  };

  // 悬浮日期 + 各基金当前点
  const hoverInfo = useMemo(() => {
    if (touchX === null || !minDate || !maxDate) return null;
    const ratio = (touchX - padding.left) / chartW;
    if (ratio < 0 || ratio > 1) return null;
    const t = new Date(minDate).getTime() + ratio * dateRange;
    const hoverDate = new Date(t).toISOString().split("T")[0];

    const points = seriesData.map((s, idx) => {
      const color = getCompareColor(funds.findIndex((f) => f.code === s.fund.code));
      const closest = s.points.reduce((prev, curr) =>
        Math.abs(new Date(curr.date).getTime() - t) < Math.abs(new Date(prev.date).getTime() - t)
          ? curr
          : prev,
      );
      return {
        code: s.fund.code,
        name: s.fund.name,
        color: color.line,
        change: closest.value - 100,
      };
    });
    return { hoverDate, points };
  }, [touchX, minDate, maxDate, dateRange, chartW, seriesData, funds]);

  return (
    <div className="touch-none select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto", minHeight: 180 }}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={() => {
          setTouchX(null);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
        }}
        onTouchCancel={() => setTouchX(null)}
        aria-label="归一化净值走势对比图，X 轴为日期，Y 轴为归一化净值"
      >
        {/* Y 轴刻度 */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={padding.left + chartW}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <text
              x={padding.left - 4}
              y={tick.y + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={9}
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* X 轴标签 */}
        <text x={padding.left} y={height - 6} className="fill-muted-foreground" fontSize={9}>
          {firstDate}
        </text>
        <text
          x={padding.left + chartW / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={9}
        >
          {midDate}
        </text>
        <text
          x={padding.left + chartW}
          y={height - 6}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={9}
        >
          {lastDate}
        </text>

        {/* 走势线 */}
        {seriesData.map((series, sIdx) => {
          if (series.points.length < 2) return null;
          const color = getCompareColor(funds.findIndex((f) => f.code === series.fund.code));

          const coords = series.points.map((p) => {
            const xRatio =
              dateRange > 0
                ? (new Date(p.date).getTime() - new Date(minDate).getTime()) / dateRange
                : 0;
            const x = padding.left + xRatio * chartW;
            const y = padding.top + chartH - ((p.value - minVal) / valRange) * chartH;
            return { x, y };
          });

          const linePath = `M${coords.map((c) => `${c.x},${c.y}`).join(" L")}`;

          return (
            <g key={series.fund.code}>
              <motion.path
                d={linePath}
                fill="none"
                stroke={color.line}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </g>
          );
        })}

        {/* 触摸十字线 */}
        {touchX !== null && touchX >= padding.left && touchX <= padding.left + chartW && (
          <line
            x1={touchX}
            y1={padding.top}
            x2={touchX}
            y2={padding.top + chartH}
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeDasharray="4 2"
          />
        )}
      </svg>

      {/* 触摸 tooltip */}
      {hoverInfo && (
        <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
          <div className="mb-1 font-medium">{hoverInfo.hoverDate}</div>
          <ul className="space-y-0.5">
            {hoverInfo.points.map((p) => (
              <li key={p.code} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span
                  className={`font-medium ${p.change >= 0 ? "text-red-500" : "text-emerald-500"}`}
                >
                  {p.change >= 0 ? "+" : ""}
                  {p.change.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
