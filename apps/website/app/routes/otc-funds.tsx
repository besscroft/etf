import type { Route } from "./+types/otc-funds";
import { Await, useLoaderData, useSearchParams } from "react-router";
import { Suspense, useCallback, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Check, LineChart, Plus, Search, Wallet, X } from "lucide-react";

import { AppHeader } from "~/components/app-header";
import { CategoryChips, FundCompareDock } from "~/components/otc";
import { MAX_COMPARE } from "~/components/compare-mobile/constants";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { AppLink as Link } from "~/components/ui/link";
import { cn } from "~/lib/utils";
import { buildMeta } from "~/lib/seo";
import {
  getPublicOTCFundData,
  isPublicOTCCategory,
  OTC_CATEGORY_LABELS,
  type OTCClassifiedFundData,
  type OTCCategory,
} from "~/lib/market-data";

export function meta() {
  return buildMeta({
    title: "场外基金",
    description: "按类型筛选和搜索场外基金，查看单只基金详情，或加入基金对比页进行多维度比较。",
    path: "/otc-funds",
  });
}

export async function loader(_args: Route.LoaderArgs) {
  return {
    fundList: getPublicOTCFundData(),
  };
}

export default function OTCFunds() {
  const { fundList } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const categoryParam = searchParams.get("category") as OTCCategory | null;
  const activeCategory: OTCCategory | "all" =
    categoryParam && isPublicOTCCategory(categoryParam) ? categoryParam : "all";

  const setCategory = (category: OTCCategory | "all") => {
    const next = new URLSearchParams(searchParams);
    if (category === "all") {
      next.delete("category");
    } else {
      next.set("category", category);
    }
    setSearchParams(next, { replace: true });
  };

  const toggleFund = useCallback((code: string) => {
    setSelectedCodes((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code);
      if (current.length >= MAX_COMPARE) return current;
      return [...current, code];
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="场外基金" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 lg:py-12">
        <Suspense fallback={<FundDiscoverySkeleton />}>
          <Await resolve={fundList}>
            {(list) => (
              <FundDiscoveryContent
                activeCategory={activeCategory}
                funds={list}
                onCategoryChange={setCategory}
                onToggleFund={toggleFund}
                query={query}
                selectedCodes={selectedCodes}
                setQuery={setQuery}
              />
            )}
          </Await>
        </Suspense>
      </main>
    </div>
  );
}

function FundDiscoveryContent({
  activeCategory,
  funds,
  onCategoryChange,
  onToggleFund,
  query,
  selectedCodes,
  setQuery,
}: {
  activeCategory: OTCCategory | "all";
  funds: OTCClassifiedFundData[];
  onCategoryChange: (category: OTCCategory | "all") => void;
  onToggleFund: (code: string) => void;
  query: string;
  selectedCodes: string[];
  setQuery: (query: string) => void;
}) {
  const filteredFunds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return funds
      .filter((fund) => activeCategory === "all" || fund.category === activeCategory)
      .filter((fund) => !q || fund.code.includes(q) || fund.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const ar = a.returnOneYear ?? -999;
        const br = b.returnOneYear ?? -999;
        if (br !== ar) return br - ar;
        return b.scale - a.scale;
      });
  }, [activeCategory, funds, query]);

  const liveFunds = filteredFunds.filter((fund) => fund.nav !== null);
  const avgOneYear =
    liveFunds.length > 0
      ? liveFunds.reduce((sum, fund) => sum + (fund.returnOneYear ?? 0), 0) / liveFunds.length
      : 0;

  return (
    <div className={cn("space-y-8", selectedCodes.length > 0 && "pb-36 md:pb-28")}>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border bg-card p-5 md:p-7">
          <Badge variant="secondary" className="mb-4 rounded-md">
            场外基金发现
          </Badge>
          <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            先筛基金，再进详情或对比。
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            按基金类型、收益和规模快速缩小范围，进入单只基金详情，或把候选加入同一组对比。
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="rounded-md">
              <Link to="/cn/funds">
                打开基金对比
                <BarChart3 className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md">
              <Link to="/otc-fund">
                单只基金详情
                <LineChart className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="size-4 text-primary" />
            当前样本
          </div>
          <div className="mt-4 grid gap-3">
            <StatCard label="筛选结果" value={`${filteredFunds.length} 只`} />
            <StatCard label="净值可用" value={`${liveFunds.length} 只`} />
            <StatCard label="样本近1年" value={formatPercent(avgOneYear)} tone={avgOneYear} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                activeCategory === "all"
                  ? "搜索基金代码或名称..."
                  : `搜索${OTC_CATEGORY_LABELS[activeCategory]}基金...`
              }
              className="h-10 w-full rounded-md border bg-background pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="清空搜索"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <CategoryChips active={activeCategory} onChange={onCategoryChange} />
        </div>
      </section>

      {filteredFunds.length > 0 ? (
        <>
          <FundGrid
            funds={filteredFunds.slice(0, 24)}
            onToggleFund={onToggleFund}
            selectedCodes={selectedCodes}
          />
          <FundTable
            funds={filteredFunds}
            onToggleFund={onToggleFund}
            selectedCodes={selectedCodes}
          />
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">没有匹配的场外基金</p>
          </CardContent>
        </Card>
      )}
      <FundCompareDock
        funds={funds}
        max={MAX_COMPARE}
        onRemove={(code) => onToggleFund(code)}
        selectedCodes={selectedCodes}
      />
    </div>
  );
}

function FundGrid({
  funds,
  onToggleFund,
  selectedCodes,
}: {
  funds: OTCClassifiedFundData[];
  onToggleFund: (code: string) => void;
  selectedCodes: string[];
}) {
  const selectedCodeSet = new Set(selectedCodes);
  const reachedLimit = selectedCodes.length >= MAX_COMPARE;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {funds.map((fund) => (
        <Card key={`${fund.category}-${fund.code}`} className="rounded-lg shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{fund.code}</span>
                  <Badge variant="secondary" className="rounded-md text-[10px]">
                    {fund.categoryLabel}
                  </Badge>
                </div>
                <h2 className="line-clamp-2 min-h-10 text-base font-semibold">{fund.name}</h2>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <Metric label="最新净值" value={formatNav(fund.nav)} />
              <Metric
                label="近1年"
                value={fund.returnOneYear !== null ? formatPercent(fund.returnOneYear) : "待更新"}
                tone={fund.returnOneYear ?? 0}
              />
              <Metric
                label="规模"
                value={fund.scale > 0 ? `${fund.scale.toFixed(1)}亿` : "待更新"}
              />
            </div>

            <div className="mt-5 flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1 rounded-md">
                <Link to={`/otc-fund?code=${fund.code}`}>
                  详情
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedCodeSet.has(fund.code) ? "secondary" : "default"}
                className="flex-1 rounded-md"
                onClick={() => onToggleFund(fund.code)}
                disabled={!selectedCodeSet.has(fund.code) && reachedLimit}
                aria-pressed={selectedCodeSet.has(fund.code)}
              >
                {selectedCodeSet.has(fund.code) ? "已加入" : "加入对比"}
                {selectedCodeSet.has(fund.code) ? (
                  <Check className="size-3.5" />
                ) : (
                  <Plus className="size-3.5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function FundTable({
  funds,
  onToggleFund,
  selectedCodes,
}: {
  funds: OTCClassifiedFundData[];
  onToggleFund: (code: string) => void;
  selectedCodes: string[];
}) {
  const selectedCodeSet = new Set(selectedCodes);
  const reachedLimit = selectedCodes.length >= MAX_COMPARE;

  return (
    <section className="hidden overflow-hidden rounded-lg border bg-card md:block">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">基金</th>
            <th className="px-4 py-3 text-left font-medium">类型</th>
            <th className="px-4 py-3 text-right font-medium">最新净值</th>
            <th className="px-4 py-3 text-right font-medium">近1年</th>
            <th className="px-4 py-3 text-right font-medium">规模</th>
            <th className="px-4 py-3 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {funds.map((fund) => (
            <tr
              key={`${fund.category}-${fund.code}`}
              className="border-t transition-colors hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <Link to={`/otc-fund?code=${fund.code}`} className="hover:text-primary">
                  <span className="font-medium">{fund.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{fund.code}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fund.categoryLabel}</td>
              <td className="px-4 py-3 text-right font-mono">{formatNav(fund.nav)}</td>
              <td
                className={`px-4 py-3 text-right font-mono ${trendClass(fund.returnOneYear ?? 0)}`}
              >
                {fund.returnOneYear !== null ? formatPercent(fund.returnOneYear) : "待更新"}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {fund.scale > 0 ? `${fund.scale.toFixed(1)}亿` : "待更新"}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFund(fund.code)}
                  disabled={!selectedCodeSet.has(fund.code) && reachedLimit}
                  aria-pressed={selectedCodeSet.has(fund.code)}
                  className={selectedCodeSet.has(fund.code) ? "text-foreground" : "text-primary"}
                >
                  {selectedCodeSet.has(fund.code) ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  {selectedCodeSet.has(fund.code) ? "已加入" : "加入对比"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StatCard({ label, value, tone = 0 }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded-lg border bg-background/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tone === 0 ? "" : trendClass(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function Metric({ label, value, tone = 0 }: { label: string; value: string; tone?: number }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate font-mono font-medium ${tone === 0 ? "" : trendClass(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function FundDiscoverySkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
      <Skeleton className="h-20 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function formatNav(value: number | null) {
  return value !== null && value > 0 ? value.toFixed(4) : "待更新";
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function trendClass(value: number) {
  if (value > 0) return "text-red-500";
  if (value < 0) return "text-emerald-500";
  return "text-muted-foreground";
}
