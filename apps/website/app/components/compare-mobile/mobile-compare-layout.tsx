/**
 * MobileCompareLayout 移动端基金对比外壳
 *
 * 负责组合所有移动端对比子组件，承担以下职责：
 * - 精简顶栏（仅返回 + 标题）
 * - 三段式 Tab 切换（指标/走势/收益）
 * - 已选基金 Chips 横向条
 * - 底部固定操作栏（添加基金）
 * - 底部抽屉搜索（按需打开）
 *
 * 状态约定：
 * - 基金增删/排序通过回调透传到父组件，由父组件同步 URL
 * - Tab 切换、Sheet 开关为本地 UI 状态
 */
import { useState } from "react";
import { AppLink as Link } from "~/components/ui/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, BarChart3, Plus } from "lucide-react";
import { DURATION, EASING } from "~/lib/motion";
import { Button } from "~/components/ui/button";
import type { FundDetailData } from "~/lib/market-data";
import { ShareExport } from "~/components/share-export";
import { COMPARE_TABS, MAX_COMPARE, type CompareTab } from "./constants";
import { FundChipStrip } from "./fund-chip-strip";
import { FundSearchSheet } from "./fund-search-sheet";
import { MetricsCompareCard } from "./metrics-compare-card";
import { TrendChartMobile } from "./trend-chart-mobile";
import { PerformanceBarsMobile } from "./performance-bars-mobile";

interface FundListItem {
  code: string;
  name: string;
}

interface MobileCompareLayoutProps {
  /** 已选基金详情（来自 loader） */
  funds: Array<FundDetailData & { error?: string }>;
  /** 全量基金列表（用于搜索） */
  fundList: FundListItem[];
  /** 添加基金 */
  onAdd: (code: string) => void;
  /** 移除基金 */
  onRemove: (code: string) => void;
  /** 置顶（移到首位，通过重排 URL 实现） */
  onPin?: (code: string) => void;
  /** 自定义 header 标题，默认「基金对比」 */
  title?: string;
  /** 渲染在 header 与 Tab 之间的额外内容（如分类过滤器），可选 */
  headerExtras?: React.ReactNode;
}

export function MobileCompareLayout({
  funds,
  fundList,
  onAdd,
  onRemove,
  onPin,
  title = "基金对比",
  headerExtras,
}: MobileCompareLayoutProps) {
  const [activeTab, setActiveTab] = useState<CompareTab>("metrics");
  const [searchOpen, setSearchOpen] = useState(false);

  const selectedCodes = funds.map((f) => f.code);
  const hasFunds = funds.length > 0;
  const canCompare = funds.length >= 2;
  const reachedLimit = funds.length >= MAX_COMPARE;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* 顶部精简 Header */}
      <header className="sticky top-0 z-40 h-12 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-full items-center gap-2 px-2">
          <Link to="/" aria-label="返回首页">
            <Button variant="ghost" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <BarChart3 className="size-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {funds.length}/{MAX_COMPARE}
          </span>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex min-h-0 flex-1 flex-col">
        {hasFunds ? (
          <>
            {/* Tab 切换栏 */}
            <div className="sticky top-12 z-30 border-b bg-background/95 backdrop-blur-sm">
              {headerExtras && <div className="border-b px-2 py-1.5">{headerExtras}</div>}
              <div className="flex">
                {COMPARE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="relative flex-1 py-2.5 text-sm font-medium transition-colors"
                    aria-pressed={activeTab === tab.key}
                  >
                    <span
                      className={
                        activeTab === tab.key ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {tab.label}
                    </span>
                    {activeTab === tab.key && (
                      <motion.span
                        layoutId="compare-tab-indicator"
                        className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 对比内容区域 */}
            <div className="bg-background p-3">
              {canCompare ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                  >
                    {activeTab === "metrics" && (
                      <MetricsCompareCard funds={funds} onRemove={onRemove} onPin={onPin} />
                    )}
                    {activeTab === "trend" && <TrendChartMobile funds={funds} />}
                    {activeTab === "performance" && <PerformanceBarsMobile funds={funds} />}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  请再选择至少 1 只基金开始对比
                </p>
              )}

              {/* 导出按钮 - 仅 ≥2 只时显示 */}
              {canCompare && (
                <div className="mt-3 flex justify-end" data-exclude-from-export="true">
                  <ShareExport module="fund-compare" data={{ funds }} fileName="fund-compare" />
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </main>

      {/* 已选基金 Chips（横向滚动） */}
      {hasFunds && (
        <div className="sticky bottom-[3.25rem] z-20 border-t bg-background/95 backdrop-blur-sm">
          <FundChipStrip funds={funds} onRemove={onRemove} />
        </div>
      )}

      {/* 底部固定操作栏 - 拇指热区 */}
      <div className="sticky bottom-0 z-30 border-t bg-background px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <button
          onClick={() => setSearchOpen(true)}
          disabled={reachedLimit}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Plus className="size-4" />
          {reachedLimit ? `已达上限 ${MAX_COMPARE} 只` : "添加基金"}
        </button>
      </div>

      {/* 底部抽屉搜索 */}
      <FundSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        fundList={fundList}
        selectedCodes={selectedCodes}
        onAdd={onAdd}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <BarChart3 className="size-12 text-muted-foreground/40" />
      <div>
        <p className="text-base font-medium">选择基金开始对比</p>
        <p className="mt-1 text-sm text-muted-foreground">
          点击下方「添加基金」按钮，选择 2-4 只基金进行多维度对比
        </p>
      </div>
    </div>
  );
}
