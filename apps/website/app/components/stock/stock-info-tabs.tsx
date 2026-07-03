/**
 * 股票信息 Tab 容器（2026-07-03 新增）
 *
 * 三个 Tab：概况 / 财务 / 新闻
 * 数据异步加载，loading 用骨架占位
 */

import * as React from "react";
import { Building2, FileText, Newspaper, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { StockCompanyInfo, StockFinancials, StockNewsItem } from "~/lib/stock-data";

type TabKey = "overview" | "financials" | "news";

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "overview", label: "公司概况", icon: Building2 },
  { key: "financials", label: "财务指标", icon: FileText },
  { key: "news", label: "近期新闻", icon: Newspaper },
];

interface StockInfoTabsProps {
  companyInfo: StockCompanyInfo | null;
  financials: StockFinancials | null;
  news: StockNewsItem[];
  /** 异步加载状态：每个 tab 的 loading 状态 */
  loading?: { overview?: boolean; financials?: boolean; news?: boolean };
}

export function StockInfoTabs({ companyInfo, financials, news, loading }: StockInfoTabsProps) {
  const [tab, setTab] = React.useState<TabKey>("overview");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <Button
                key={t.key}
                type="button"
                variant={active ? "default" : "secondary"}
                size="sm"
                onClick={() => setTab(t.key)}
                className="shrink-0"
              >
                <Icon className="mr-1 size-3" />
                {t.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {tab === "overview" && <OverviewPanel info={companyInfo} loading={loading?.overview} />}
        {tab === "financials" && (
          <FinancialsPanel data={financials} loading={loading?.financials} />
        )}
        {tab === "news" && <NewsPanel items={news} loading={loading?.news} />}
      </CardContent>
    </Card>
  );
}

function OverviewPanel({ info, loading }: { info: StockCompanyInfo | null; loading?: boolean }) {
  if (loading) return <SkeletonList rows={6} />;
  if (!info) {
    return <Empty text="暂无公司概况数据" />;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <InfoRow label="公司全称" value={info.name} />
        <InfoRow label="所属行业" value={info.industry} />
        <InfoRow label="上市日期" value={info.listingDate} />
        <InfoRow label="总股本" value={info.totalShares} />
        <InfoRow label="流通股本" value={info.circulatingShares} />
      </div>
      {info.mainBusiness && info.mainBusiness !== "—" && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-muted-foreground">主营业务</h4>
          <p className="text-sm leading-relaxed">{info.mainBusiness}</p>
        </div>
      )}
    </div>
  );
}

function FinancialsPanel({ data, loading }: { data: StockFinancials | null; loading?: boolean }) {
  if (loading) return <SkeletonList rows={9} />;
  if (!data) {
    return <Empty text="暂无财务指标数据" />;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <InfoRow label="每股收益" value={fmtNum(data.eps, 2)} unit="元" />
        <InfoRow label="每股净资产" value={fmtNum(data.bvps, 2)} unit="元" />
        <InfoRow label="净资产收益率" value={fmtPct(data.roe)} />
        <InfoRow label="毛利率" value={fmtPct(data.grossMargin)} />
        <InfoRow label="资产负债率" value={fmtPct(data.debtRatio)} />
        <InfoRow label="市盈率" value={fmtNum(data.pe, 2)} />
        <InfoRow label="市净率" value={fmtNum(data.pb, 2)} />
        <InfoRow label="市销率" value={fmtNum(data.ps, 2)} />
        <InfoRow label="总市值" value={fmtMarketCap(data.totalMarketCap)} />
        <InfoRow label="流通市值" value={fmtMarketCap(data.circulatingMarketCap)} />
      </div>
      {data.reportDate && data.reportDate !== "—" && (
        <p className="text-right text-[11px] text-muted-foreground">数据期：{data.reportDate}</p>
      )}
    </div>
  );
}

function NewsPanel({ items, loading }: { items: StockNewsItem[]; loading?: boolean }) {
  if (loading) return <SkeletonList rows={5} />;
  if (items.length === 0) {
    return <Empty text="暂无新闻数据" />;
  }
  return (
    <ul className="divide-y">
      {items.map((item, idx) => (
        <li key={idx} className="py-3 first:pt-0 last:pb-0">
          <a
            href={item.url || "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="group block hover:opacity-80"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <h4 className="line-clamp-1 text-sm font-medium group-hover:text-primary">
                {item.title}
              </h4>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
            </div>
            {item.summary && (
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              {item.source && <span>{item.source}</span>}
              {item.publishTime && <span>· {item.publishTime}</span>}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

function InfoRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed py-1.5 last:border-0 sm:border-0 sm:py-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {value}
        {unit ? <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span> : null}
      </span>
    </div>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-dashed py-1.5 last:border-0"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

// ==================== 格式化工具 ====================

function fmtNum(v: number | null, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function fmtPct(v: number | null, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}%`;
}

function fmtMarketCap(v: number | null): string {
  if (v == null || !Number.isFinite(v) || v === 0) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}万亿`;
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)}亿`;
  return `${v.toFixed(0)}元`;
}
