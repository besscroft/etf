/**
 * MobileCompareLayout 移动端基金对比外壳
 *
 * 负责组合所有移动端对比子组件，承担以下职责：
 * - 精简顶栏（仅返回 + 标题 + 数量徽章 + 自选入口）
 * - 独立分类 chips sticky 行（在 header 与 Tab 之间）
 * - 三段式 Tab 切换（指标/走势/收益）
 * - 主体内容：MetricsCompareCard / TrendChartMobile / PerformanceBarsMobile
 * - 单层一体化底栏：FundChipStrip（横向滚动）+ 主操作按钮
 * - 底部抽屉搜索 + 自选基金 Sheet
 *
 * 状态约定：
 * - 基金增删/排序通过回调透传到父组件，由父组件同步 URL
 * - 分类由父组件 URL 同步（activeCategory），本组件只做渲染
 * - Tab 切换、Sheet 开关为本地 UI 状态
 */
import { useState } from "react";
import { AppLink as Link } from "~/components/ui/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Plus, Database, BarChart3 } from "lucide-react";
import { DURATION, EASING } from "~/lib/motion";
import { Button } from "~/components/ui/button";
import type { FundDetailData, OTCCategory } from "~/lib/market-data";
import type { CustomOTCFund } from "~/stores/custom-otc-funds";
import { ShareExport } from "~/components/share-export";
import { CategoryChips } from "~/components/otc";
import { COMPARE_TABS, MAX_COMPARE, type CompareTab } from "./constants";
import { FundChipStrip } from "./fund-chip-strip";
import { FundSearchSheet, type FundListItem } from "./fund-search-sheet";
import { CustomFundsSheet } from "./custom-funds-sheet";
import { MetricsCompareCard } from "./metrics-compare-card";
import { TrendChartMobile } from "./trend-chart-mobile";
import { PerformanceBarsMobile } from "./performance-bars-mobile";

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
  /** 保存浏览器自选并加入 */
  onAddCustomFund?: (code: string) => void;
  /** 图表点击详情链接 */
  detailHref?: (code: string) => string;
  /** 自定义 header 标题，默认「基金对比」 */
  title?: string;
  /** 当前分类（URL 同步），决定顶部 chips 高亮；不传则隐藏分类 chips 行 */
  category?: OTCCategory | "all";
  /** 切换分类；不传则分类 chips 不可点 */
  onCategoryChange?: (cat: OTCCategory | "all") => void;
  /** 自选基金列表（用于 header 自选入口） */
  customFunds?: CustomOTCFund[];
}

export function MobileCompareLayout({
  funds,
  fundList,
  onAdd,
  onRemove,
  onPin,
  onAddCustomFund,
  detailHref = (code) => `/fund/${code}`,
  title = "基金对比",
  category,
  onCategoryChange,
  customFunds = [],
}: MobileCompareLayoutProps) {
  const [activeTab, setActiveTab] = useState<CompareTab>("metrics");
  const [searchOpen, setSearchOpen] = useState(false);
  const [customFundsOpen, setCustomFundsOpen] = useState(false);

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
          <span className="text-sm font-semibold">{title}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {funds.length}/{MAX_COMPARE}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCustomFundsOpen(true)}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="打开自选基金"
              aria-expanded={customFundsOpen}
            >
              <Database className="size-3.5" />
              <span>自选 {customFunds.length > 0 ? `(${customFunds.length})` : ""}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 分类 chips 独立 sticky 行（仅在传 category 时显示） */}
      {category !== undefined && onCategoryChange && (
        <div className="sticky top-12 z-30 border-b bg-background/95 px-2 py-1.5 backdrop-blur-sm">
          <CategoryChips active={category} onChange={onCategoryChange} compact />
        </div>
      )}

      {/* 主体内容 */}
      <main className="flex min-h-0 flex-1 flex-col">
        {hasFunds ? (
          <>
            {/* Tab 切换栏 */}
            <div
              className={`sticky ${
                category !== undefined ? "top-[5.0625rem]" : "top-12"
              } z-20 border-b bg-background/95 backdrop-blur-sm`}
            >
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
                    {activeTab === "trend" && (
                      <TrendChartMobile funds={funds} detailHref={detailHref} />
                    )}
                    {activeTab === "performance" && (
                      <PerformanceBarsMobile funds={funds} detailHref={detailHref} />
                    )}
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

      {/* 单层一体化底栏：已选 chips + 主操作按钮 */}
      {hasFunds && (
        <div className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur-sm">
          <FundChipStrip funds={funds} onRemove={onRemove} />
          <div className="px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
            <Button
              onClick={() => setSearchOpen(true)}
              disabled={reachedLimit}
              className="h-10 w-full"
            >
              <Plus className="size-4" />
              {reachedLimit ? `已达上限 ${MAX_COMPARE} 只` : "添加基金"}
            </Button>
          </div>
        </div>
      )}

      {/* 未选基金时也展示「添加基金」按钮（不显示 chips） */}
      {!hasFunds && (
        <div className="sticky bottom-0 z-30 border-t bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm">
          <Button
            onClick={() => setSearchOpen(true)}
            disabled={reachedLimit}
            className="h-10 w-full"
          >
            <Plus className="size-4" />
            {reachedLimit ? `已达上限 ${MAX_COMPARE} 只` : "添加基金"}
          </Button>
        </div>
      )}

      {/* 底部抽屉搜索 */}
      <FundSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        fundList={fundList}
        selectedCodes={selectedCodes}
        onAdd={onAdd}
        onAddCustom={onAddCustomFund}
        customAddCategoryLabel={category === "all" ? undefined : category}
      />

      {/* 自选基金 Sheet */}
      <CustomFundsSheet
        open={customFundsOpen}
        onOpenChange={setCustomFundsOpen}
        customFunds={customFunds}
        selectedCodes={selectedCodes}
        onAdd={onAdd}
        onAddCustom={onAddCustomFund}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <BarChart3 className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-medium">选择基金开始对比</p>
        <p className="mt-1 text-sm text-muted-foreground">
          点击下方「添加基金」按钮，选择 2-4 只基金进行多维度对比
        </p>
      </div>
    </div>
  );
}
