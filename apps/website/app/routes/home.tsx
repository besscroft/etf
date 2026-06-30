import type { Route } from "./+types/home";
import { useLoaderData } from "react-router";
import { AppLink as Link } from "~/components/ui/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  MotionCard,
  MotionButton,
  AnimatedCounter,
} from "~/components/motion";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Search,
  ArrowRight,
  Activity,
  Gauge,
  LineChart,
  Menu,
  X,
  TrendingUp,
  Plus,
  Check,
  Layers,
} from "lucide-react";
import { getMarketData, type MarketData } from "~/lib/market-data";
import { cn } from "~/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { useMotionConfig, DURATION, EASING, DISTANCE } from "~/lib/motion";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "ETFVoid - 美股ETF与QDII基金追踪平台" },
    {
      name: "description",
      content: "覆盖纳斯达克100、标普500被动指数及主动型QDII基金，提供费率对比与申购状态追踪。",
    },
  ];
}

export async function loader() {
  const data = await getMarketData();
  return data;
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <main className="container mx-auto max-w-6xl px-3 pb-4 sm:px-4">
        <HeroSection data={data} />
        <MarketIndicators data={data} />
        <MarketTemperature data={data} />
        <ToolboxSection />
        <QDIIFundSection data={data} />
      </main>
      <Footer fetchedAt={data.fetchedAt} />
    </div>
  );
}

/* ==================== Header ==================== */

function Header({
  mobileMenuOpen,
  onToggleMenu,
}: {
  mobileMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const navItems = [
    { label: "首页", href: "/" },
    { label: "纳指被动", href: "/nasdaq" },
    { label: "标普500", href: "/sp500" },
    { label: "美股主动", href: "/active" },
  ];

  // 滚动方向检测：向下滚动隐藏 Header，向上滚动显示
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const { shouldReduceMotion } = useMotionConfig();

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      // 顶部 60px 内始终显示，避免遮挡内容
      if (currentY < 60) {
        setHidden(false);
      } else if (currentY > lastScrollY.current + 8) {
        // 向下滚动超过 8px 触发隐藏，避免抖动
        setHidden(true);
      } else if (currentY < lastScrollY.current - 8) {
        // 向上滚动超过 8px 触发显示
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm"
      // 入场：从顶部滑入；滚动隐藏：向上平移自身高度
      initial={{ y: -DISTANCE.md, opacity: 0 }}
      animate={{
        y: shouldReduceMotion ? 0 : hidden ? -100 : 0,
        opacity: 1,
      }}
      transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
    >
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -DISTANCE.xs }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: DURATION.normal, ease: EASING.easeOut }}
        >
          <BarChart3 className="size-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">ETFVoid</span>
        </motion.div>

        {/* 桌面端导航：stagger 入场 */}
        <StaggerContainer as="nav" className="hidden items-center gap-1 md:flex" stagger={0.04}>
          {navItems.map((item) => (
            <StaggerItem key={item.label}>
              <MotionButton variant="ghost" size="sm" asChild>
                <Link to={item.href}>{item.label}</Link>
              </MotionButton>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* 移动端菜单按钮：缩放切换动画 */}
        <MotionButton
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleMenu}
          aria-label="菜单"
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileMenuOpen ? (
              <motion.span
                key="close"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: DURATION.fast, ease: EASING.easeInOut }}
              >
                <X className="size-5" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: DURATION.fast, ease: EASING.easeInOut }}
              >
                <Menu className="size-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </MotionButton>
      </div>

      {/* 移动端下拉菜单：AnimatePresence 展开动画 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            className="border-t bg-background px-3 py-2 md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.normal, ease: EASING.easeInOut }}
            style={{ overflow: "hidden" }}
          >
            <StaggerContainer className="flex flex-col gap-0.5" stagger={0.05}>
              {navItems.map((item) => (
                <StaggerItem key={item.label}>
                  <MotionButton variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link to={item.href}>{item.label}</Link>
                  </MotionButton>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ==================== Hero 区域 ==================== */

function HeroSection({ data }: { data: MarketData }) {
  return (
    <section className="py-8 md:py-16">
      {/* 首屏指标：stagger 依次入场，数字滚动 */}
      <StaggerContainer
        className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4"
        stagger={0.1}
      >
        <StaggerItem>
          <MetricCard
            label="纳斯达克"
            numericValue={data.nasdaq.price ?? 0}
            sub={formatChange(data.nasdaq.changePercent)}
            trend={getTrend(data.nasdaq.changePercent)}
            highlight
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="纳指100"
            numericValue={data.nasdaq100.price ?? 0}
            sub={formatChange(data.nasdaq100.changePercent)}
            trend={getTrend(data.nasdaq100.changePercent)}
            highlight
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="标普500"
            numericValue={data.sp500.price ?? 0}
            sub={formatChange(data.sp500.changePercent)}
            trend={getTrend(data.sp500.changePercent)}
            highlight
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="道琼斯"
            numericValue={data.dowJones.price ?? 0}
            sub={formatChange(data.dowJones.changePercent)}
            trend={getTrend(data.dowJones.changePercent)}
            highlight
          />
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}

function MetricCard({
  label,
  numericValue,
  sub,
  trend,
  highlight,
  warning,
  suffix = "",
}: {
  label: string;
  /** 数值（用于滚动动画），为 0 且无数据时应显示 "—" */
  numericValue: number;
  sub: string;
  trend: "up" | "down" | "neutral";
  highlight?: boolean;
  warning?: boolean;
  suffix?: string;
}) {
  const valueColor = warning
    ? "text-amber-500"
    : trend === "up"
      ? "text-red-500"
      : trend === "down"
        ? "text-emerald-500"
        : "text-foreground";

  // 数值为 0 视为无数据，显示 "—"
  const hasData = numericValue !== 0;

  return (
    <MotionCard hover className="h-full">
      <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center sm:gap-1 sm:py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xl font-bold sm:text-2xl ${valueColor}`}>
          {hasData ? <AnimatedCounter value={numericValue} decimals={0} suffix={suffix} /> : "—"}
        </span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </CardContent>
    </MotionCard>
  );
}

/* ==================== 市场情绪指标 ==================== */

function MarketIndicators({ data }: { data: MarketData }) {
  // VIX 等级判定
  const vixLevel = getVixLevel(data.vix.value);
  // 恐慌贪婪等级
  const fgLevel = getFearGreedLevel(data.fearGreed.value);
  // PE 分位（基于历史分位估算，PE > 30 为高估区间）
  const pePercentile = data.sp500PE.value ? estimatePePercentile(data.sp500PE.value) : null;
  const peLevel = getPeLevel(pePercentile);
  // 纳指100 PE 分位
  const ndxPePercentile = data.nasdaq100PE.value
    ? estimateNasdaq100PePercentile(data.nasdaq100PE.value)
    : null;
  const ndxPeLevel = getPeLevel(ndxPePercentile);

  return (
    <section className="mb-8 md:mb-10">
      <SectionTitle title="市场情绪指标" />
      <StaggerContainer
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4"
        stagger={0.1}
        inView
      >
        {/* VIX */}
        <StaggerItem>
          <MotionCard hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Activity className="size-4 text-amber-500" />
                VIX 恐慌指数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end gap-2">
                <span className="text-2xl font-bold md:text-3xl">
                  {data.vix.value ? <AnimatedCounter value={data.vix.value} decimals={2} /> : "—"}
                </span>
                <Badge variant={vixLevel.badgeVariant}>{vixLevel.label}</Badge>
              </div>
              <ProgressBar value={Math.min(100, (data.vix.value / 40) * 100)} gradient="vix" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 平静</span>
                <span>20</span>
                <span>40 恐慌</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                CBOE官方 ·{" "}
                {data.vix.changePercent !== null
                  ? formatChange(data.vix.changePercent) + " 今日"
                  : "—"}
              </p>
            </CardContent>
          </MotionCard>
        </StaggerItem>

        {/* 恐慌贪婪指数 */}
        <StaggerItem>
          <MotionCard hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Gauge className="size-4 text-orange-500" />
                市场情绪指数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end gap-2">
                <span className="text-2xl font-bold md:text-3xl">
                  {data.fearGreed.value ? <AnimatedCounter value={data.fearGreed.value} /> : "—"}
                </span>
                <Badge variant={fgLevel.badgeVariant}>{fgLevel.label}</Badge>
              </div>
              <ProgressBar value={data.fearGreed.value} gradient="greed" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 极度恐慌</span>
                <span>50</span>
                <span>100 极度贪婪</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                基于 VIX + 标普500 + 纳斯达克 综合计算
                {data.fearGreed.previousClose !== null && ` · 昨收 ${data.fearGreed.previousClose}`}
              </p>
            </CardContent>
          </MotionCard>
        </StaggerItem>

        {/* PE 分位 */}
        <StaggerItem className="sm:col-span-2 lg:col-span-1">
          <MotionCard hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <LineChart className="size-4 text-red-500" />
                标普500 PE分位
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end gap-2">
                <span className="text-2xl font-bold md:text-3xl">
                  {data.sp500PE.value ? (
                    <AnimatedCounter value={data.sp500PE.value} decimals={1} suffix="x" />
                  ) : (
                    "—"
                  )}
                </span>
                <Badge variant={peLevel.badgeVariant}>{peLevel.label}</Badge>
              </div>
              <ProgressBar value={pePercentile ?? 50} gradient="pe" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 低估</span>
                <span>50</span>
                <span>100 高估</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                历史{pePercentile ?? "—"}%分位 · 来源 {data.sp500PE.source}
              </p>
            </CardContent>
          </MotionCard>
        </StaggerItem>

        {/* 纳指100 PE 分位 */}
        <StaggerItem className="sm:col-span-2 lg:col-span-1">
          <MotionCard hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <LineChart className="size-4 text-purple-500" />
                纳指100 PE分位
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end gap-2">
                <span className="text-2xl font-bold md:text-3xl">
                  {data.nasdaq100PE.value ? (
                    <AnimatedCounter value={data.nasdaq100PE.value} decimals={1} suffix="x" />
                  ) : (
                    "—"
                  )}
                </span>
                <Badge variant={ndxPeLevel.badgeVariant}>{ndxPeLevel.label}</Badge>
              </div>
              <ProgressBar value={ndxPePercentile ?? 50} gradient="pe" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 低估</span>
                <span>50</span>
                <span>100 高估</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                历史{ndxPePercentile ?? "—"}%分位 · 来源 {data.nasdaq100PE.source}
              </p>
            </CardContent>
          </MotionCard>
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}

/**
 * 动画进度条：宽度从 0 增长到目标值
 * 进入视口时触发，支持三种渐变配色
 */
function ProgressBar({ value, gradient }: { value: number; gradient: "vix" | "greed" | "pe" }) {
  const { shouldReduceMotion } = useMotionConfig();
  const gradientClass = {
    vix: "bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500",
    greed: "bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500",
    pe: "bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500",
  }[gradient];

  const targetWidth = `${Math.max(0, Math.min(100, value))}%`;

  return (
    <div className="relative mb-1 h-2 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className={`absolute left-0 top-0 h-full rounded-full ${gradientClass}`}
        initial={{ width: 0 }}
        whileInView={{ width: targetWidth }}
        viewport={{ amount: 0.5, once: true }}
        transition={
          shouldReduceMotion ? { duration: 0 } : { duration: DURATION.slower, ease: EASING.easeOut }
        }
      />
    </div>
  );
}

/* ==================== 综合市场温度 ==================== */

function MarketTemperature({ data }: { data: MarketData }) {
  const pePercentile = data.sp500PE.value ? estimatePePercentile(data.sp500PE.value) : 50;
  const fgScore = data.fearGreed.value;
  const vixScore = data.vix.value;

  // 综合温度计算：PE分位权重40% + 恐慌贪婪(反转)权重30% + VIX权重30%
  // PE分位越高越危险；恐慌贪婪越低越恐慌(机会)；VIX越高越恐慌
  const tempScore =
    pePercentile * 0.4 + (100 - fgScore) * 0.3 + Math.min(100, (vixScore / 40) * 100) * 0.3;

  const tempLabel = getTemperatureLabel(tempScore);
  const tempColor = getTemperatureColor(tempScore);
  const fgLevel = getFearGreedLevel(fgScore);
  const vixLevel = getVixLevel(vixScore);
  const { shouldReduceMotion } = useMotionConfig();

  return (
    <section className="mb-8 md:mb-10">
      <SectionTitle title="综合市场温度" />
      <MotionCard hover inView>
        <CardHeader className="pb-2">
          <CardDescription>标普PE分位 + 恐慌贪婪 + VIX 三因子合并信号</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-3">
            <span className={`text-xl font-bold md:text-2xl ${tempColor}`}>{tempLabel}</span>
          </div>
          {/* 温度条：指针从左端滑到目标位置 */}
          <div className="relative mb-2 h-3 w-full overflow-hidden rounded-full md:h-4">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
            <motion.div
              className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-foreground shadow-sm"
              initial={{ left: "0%" }}
              whileInView={{ left: `${Math.max(0, Math.min(100, tempScore))}%` }}
              viewport={{ amount: 0.5, once: true }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: DURATION.slower, ease: EASING.easeOut, delay: 0.2 }
              }
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>机会区</span>
            <span>中性</span>
            <span>危险区</span>
          </div>

          {/* 因子明细：stagger 入场 */}
          <StaggerContainer
            className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3"
            stagger={0.08}
            inView
          >
            <StaggerItem>
              <TempFactor
                label="标普500 PE"
                value={data.sp500PE.value ? `${data.sp500PE.value}x` : "—"}
                status={pePercentile > 80 ? "极度高估" : pePercentile > 60 ? "偏高" : "合理"}
                level={pePercentile > 80 ? "danger" : pePercentile > 60 ? "neutral" : "opportunity"}
              />
            </StaggerItem>
            <StaggerItem>
              <TempFactor
                label="恐慌贪婪"
                value={`${fgScore}分`}
                status={fgLevel.label}
                level={fgScore < 30 ? "opportunity" : fgScore > 70 ? "danger" : "neutral"}
              />
            </StaggerItem>
            <StaggerItem>
              <TempFactor
                label="VIX 波动"
                value={`${vixScore}`}
                status={vixLevel.label}
                level={vixScore > 25 ? "opportunity" : vixScore < 15 ? "danger" : "neutral"}
              />
            </StaggerItem>
          </StaggerContainer>

          <p className="mt-4 text-xs text-muted-foreground">
            {tempScore > 65
              ? "市场偏热，注意控制仓位和止损"
              : tempScore < 35
                ? "市场偏冷，可关注逢低布局机会"
                : "信号混合，维持正常仓位，注意止损"}
          </p>
        </CardContent>
      </MotionCard>
    </section>
  );
}

function TempFactor({
  label,
  value,
  status,
  level,
}: {
  label: string;
  value: string;
  status: string;
  level: "opportunity" | "neutral" | "danger";
}) {
  const colorMap = {
    opportunity: "text-emerald-500",
    neutral: "text-amber-500",
    danger: "text-red-500",
  };
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
      <div className={`text-xs ${colorMap[level]}`}>{status}</div>
    </div>
  );
}

/* ==================== 投资工具箱 ==================== */

function ToolboxSection() {
  return (
    <section className="mb-8 md:mb-10">
      <SectionTitle title="投资工具箱" />
      <StaggerContainer
        className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4"
        stagger={0.1}
        inView
      >
        <StaggerItem className="[&>div]:h-full">
          <ToolCard
            icon={<Search className="size-5" />}
            title="基金对比"
            description="净值趋势、阶段收益、费率、风险（波动/回撤）、持仓与基金经理履历一览"
            href="/cn/funds"
          />
        </StaggerItem>
        <StaggerItem className="[&>div]:h-full">
          <ToolCard
            icon={<BarChart3 className="size-5" />}
            title="基金分析"
            description="单基金深度分析：净值走势、全周期收益、最大回撤、月度热力图与经理履历"
            href="/cn/fund"
          />
        </StaggerItem>
        <StaggerItem className="[&>div]:h-full">
          <ToolCard
            icon={<Gauge className="size-5" />}
            title="QDII估值"
            description="QDII基金实时估值追踪：盘中估值、估值偏差分析、估值走势与涨跌预警"
            href="/qdii-valuation"
          />
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}

function ToolCard({
  icon,
  title,
  description,
  href,
  quickLinks,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  quickLinks?: { label: string; href: string }[];
  extra?: string;
}) {
  return (
    <MotionCard hover className="flex h-full flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <motion.span
            className="text-primary"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
          >
            {icon}
          </motion.span>
          {title}
        </CardTitle>
        <CardDescription className="min-h-[2.5rem] text-xs md:text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col flex-1">
        {extra && <p className="mb-3 text-xs text-muted-foreground">{extra}</p>}
        {quickLinks && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {quickLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
        {href && (
          <div className="mt-auto">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href={href}>
                进入
                <ArrowRight className="ml-1 size-3" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}

/* ==================== QDII 基金列表 ==================== */

type QDIISortField =
  | "code"
  | "name"
  | "categoryLabel"
  | "scale"
  | "returnOneYear"
  | "changeDaily"
  | "purchaseStatus"
  | "purchaseLimit";
type QDIISortDir = "asc" | "desc";
type QDIIFilterCategory = "all" | "nasdaq100" | "sp500" | "active";
type QDIIFilterStatus = "all" | "open" | "suspended";

function QDIIFundSection({ data }: { data: MarketData }) {
  const funds = data.qdiiFunds;
  const [sortField, setSortField] = useState<QDIISortField>("returnOneYear");
  const [sortDir, setSortDir] = useState<QDIISortDir>("desc");
  const [filterCategory, setFilterCategory] = useState<QDIIFilterCategory>("all");
  const [filterStatus, setFilterStatus] = useState<QDIIFilterStatus>("all");
  const [compareList, setCompareList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSort = (field: QDIISortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "returnOneYear" || field === "scale" ? "desc" : "asc");
    }
  };

  const toggleCompare = (code: string) => {
    setCompareList((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const filtered = useMemo(() => {
    let list = [...funds];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.code.includes(q) || f.name.toLowerCase().includes(q) || f.categoryLabel.includes(q),
      );
    }
    if (filterCategory !== "all") {
      list = list.filter((f) => f.category === filterCategory);
    }
    if (filterStatus === "open") {
      list = list.filter((f) => f.purchaseStatus !== "暂停");
    } else if (filterStatus === "suspended") {
      list = list.filter((f) => f.purchaseStatus === "暂停");
    }
    list.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortField) {
        case "code":
          va = a.code;
          vb = b.code;
          break;
        case "name":
          va = a.name;
          vb = b.name;
          break;
        case "categoryLabel":
          va = a.categoryLabel;
          vb = b.categoryLabel;
          break;
        case "scale":
          va = a.scale;
          vb = b.scale;
          break;
        case "returnOneYear":
          va = a.returnOneYear ?? -999;
          vb = b.returnOneYear ?? -999;
          break;
        case "changeDaily":
          va = a.changeDaily ?? -999;
          vb = b.changeDaily ?? -999;
          break;
        case "purchaseStatus":
          va = a.purchaseStatus;
          vb = b.purchaseStatus;
          break;
        case "purchaseLimit":
          va = a.purchaseLimit;
          vb = b.purchaseLimit;
          break;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [funds, filterCategory, filterStatus, sortField, sortDir, searchQuery]);

  const nasdaqCount = funds.filter((f) => f.category === "nasdaq100").length;
  const sp500Count = funds.filter((f) => f.category === "sp500").length;
  const activeCount = funds.filter((f) => f.category === "active").length;
  const openCount = funds.filter((f) => f.purchaseStatus !== "暂停").length;
  const suspendedCount = funds.filter((f) => f.purchaseStatus === "暂停").length;

  // 分类标签颜色
  const CATEGORY_COLORS: Record<string, string> = {
    nasdaq100: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    sp500: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    active: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  return (
    <section className="mb-8 md:mb-10">
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <SectionTitle title="QDII 基金" />
        <Link
          to="/qdii"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          查看全部 <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* 搜索栏 */}
      <FadeIn className="mb-3" delay={0.1}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索基金代码或名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </FadeIn>

      {/* 筛选：分类 + 状态。始终单行；移动端紧凑（更小 padding + 隐藏 count）以 fit 视口。 */}
      <FadeIn className="mb-4 flex flex-nowrap items-center gap-2 sm:gap-3" delay={0.12}>
        <SegmentedFilter
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { key: "all", label: "全部", count: funds.length },
            { key: "nasdaq100", label: "纳指", count: nasdaqCount },
            { key: "sp500", label: "标普", count: sp500Count },
            { key: "active", label: "主动", count: activeCount },
          ]}
        />
        <SegmentedFilter
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { key: "all", label: "全部" },
            { key: "open", label: "开放", count: openCount },
            { key: "suspended", label: "暂停", count: suspendedCount },
          ]}
        />
      </FadeIn>

      {/* 对比浮动栏 - 桌面端（列表上方，原样式） */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            key="compare-bar-desktop"
            className="mb-4 hidden md:block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">已选 {compareList.length} 只基金</span>
                  {compareList.map((code) => {
                    const fund = funds.find((f) => f.code === code);
                    return (
                      <Badge key={code} variant="secondary" className="text-xs">
                        {fund?.name?.slice(0, 6) ?? code}
                        <button
                          onClick={() => toggleCompare(code)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCompareList([])}>
                    清空
                  </Button>
                  {compareList.length >= 2 && (
                    <Button size="sm" asChild>
                      <Link to={`/cn/funds?funds=${compareList.join(",")}`}>对比</Link>
                    </Button>
                  )}
                  {compareList.length === 1 && (
                    <Button size="sm" asChild>
                      <Link to={`/cn/fund?code=${compareList[0]}`}>分析</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 对比浮动栏 - 移动端（fixed bottom 悬浮 action bar） */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            key="compare-bar-mobile"
            className="fixed inset-x-0 bottom-0 z-50 px-3 md:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
          >
            <div className="rounded-xl border border-primary/30 bg-background/95 p-3 shadow-lg backdrop-blur-md">
              {/* 头部：标题 + 主操作 */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="size-4 text-primary" />
                  <span className="text-sm font-medium">对比栏</span>
                  <span className="text-xs text-muted-foreground">({compareList.length})</span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompareList([])}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    清空
                  </Button>
                  {compareList.length >= 2 && (
                    <Button size="sm" asChild className="h-7 px-3 text-xs">
                      <Link to={`/cn/funds?funds=${compareList.join(",")}`}>
                        对比 <ArrowRight className="ml-0.5 size-3" />
                      </Link>
                    </Button>
                  )}
                  {compareList.length === 1 && (
                    <Button size="sm" asChild className="h-7 px-3 text-xs">
                      <Link to={`/cn/fund?code=${compareList[0]}`}>
                        分析 <ArrowRight className="ml-0.5 size-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              {/* 已选徽章：自动换行 */}
              <div className="flex flex-wrap gap-1">
                {compareList.map((code) => {
                  const fund = funds.find((f) => f.code === code);
                  return (
                    <Badge key={code} variant="secondary" className="text-xs">
                      {fund?.name?.slice(0, 8) ?? code}
                      <button
                        onClick={() => toggleCompare(code)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`移除 ${fund?.name ?? code}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 基金列表：移动端卡片视图（md 以下） */}
      <FadeIn className="md:hidden" delay={0.15}>
        <div className="flex flex-col gap-2 pb-24">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">无匹配基金</div>
          )}
          {filtered.map((fund) => {
            const isSuspended = fund.purchaseStatus === "暂停";
            const isSelected = compareList.includes(fund.code);
            return (
              <MotionCard
                key={`mobile-${fund.category}-${fund.code}`}
                hover
                className={`relative transition-colors ${
                  isSelected
                    ? "border-primary ring-1 ring-primary/40"
                    : isSuspended
                      ? "opacity-60"
                      : ""
                }`}
              >
                <CardContent className="p-3">
                  {/* 头部：代码/类型 + 申购状态 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">{fund.code}</span>
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[fund.category] ?? ""}`}
                        >
                          {fund.categoryLabel}
                        </span>
                      </div>
                      <Link
                        to={`/fund/${fund.code}`}
                        className="mt-0.5 block truncate text-sm font-medium hover:text-primary"
                      >
                        {fund.name}
                      </Link>
                    </div>
                    <Badge
                      variant={isSuspended ? "destructive" : "secondary"}
                      className="shrink-0 text-[10px]"
                    >
                      {fund.purchaseStatus}
                    </Badge>
                  </div>

                  {/* 收益指标：近1年 + 昨日涨跌 */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">近1年</div>
                      {fund.returnOneYear !== null ? (
                        <span
                          className={`text-base font-bold ${fund.returnOneYear > 0 ? "text-red-500" : fund.returnOneYear < 0 ? "text-emerald-500" : ""}`}
                        >
                          {fund.returnOneYear > 0 ? "+" : ""}
                          {fund.returnOneYear.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-base font-bold text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">昨日涨跌</div>
                      {fund.changeDaily !== null ? (
                        <span
                          className={`text-sm font-medium ${fund.changeDaily > 0 ? "text-red-500" : fund.changeDaily < 0 ? "text-emerald-500" : ""}`}
                        >
                          {fund.changeDaily > 0 ? "+" : ""}
                          {fund.changeDaily.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  {/* 底部操作行：规模/限额 + 分析 + 加入对比 */}
                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <div className="flex min-w-0 flex-1 flex-col text-xs text-muted-foreground">
                      <span>规模 {fund.scale > 0 ? `${fund.scale.toFixed(1)}亿` : "—"}</span>
                      <span className="truncate">限额 {fund.purchaseLimit}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        to={`/cn/fund?code=${fund.code}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                      >
                        <TrendingUp className="size-3" />
                        分析
                      </Link>
                      <motion.button
                        onClick={() => toggleCompare(fund.code)}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                        aria-pressed={isSelected}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="size-3" />
                            已加入
                          </>
                        ) : (
                          <>
                            <Plus className="size-3" />
                            对比
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </CardContent>
              </MotionCard>
            );
          })}
        </div>
      </FadeIn>

      {/* 基金表格：桌面端表格视图（md 及以上） */}
      <FadeIn className="hidden md:block" delay={0.15}>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <QDIIThSortable
                      label="代码"
                      field="code"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <QDIIThSortable
                      label="基金名称"
                      field="name"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <QDIIThSortable
                      label="类型"
                      field="categoryLabel"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <QDIIThSortable
                      label="规模(亿)"
                      field="scale"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <QDIIThSortable
                      label="近1年"
                      field="returnOneYear"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <QDIIThSortable
                      label="昨日涨跌"
                      field="changeDaily"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <QDIIThSortable
                      label="申购状态"
                      field="purchaseStatus"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <QDIIThSortable
                      label="每日限额"
                      field="purchaseLimit"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <th className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((fund) => {
                    const isSuspended = fund.purchaseStatus === "暂停";
                    const isSelected = compareList.includes(fund.code);
                    return (
                      <tr
                        key={`${fund.category}-${fund.code}`}
                        className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${isSuspended ? "opacity-60" : ""}`}
                      >
                        <td className="py-2.5 px-3 font-mono text-xs">{fund.code}</td>
                        <td className="py-2.5 px-3">
                          <Link
                            to={`/fund/${fund.code}`}
                            className="hover:text-primary hover:underline text-sm"
                          >
                            {fund.name}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[fund.category] ?? ""}`}
                          >
                            {fund.categoryLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {fund.scale > 0 ? fund.scale.toFixed(1) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {fund.returnOneYear !== null ? (
                            <span
                              className={`font-medium ${fund.returnOneYear > 0 ? "text-red-500" : fund.returnOneYear < 0 ? "text-emerald-500" : ""}`}
                            >
                              {fund.returnOneYear > 0 ? "+" : ""}
                              {fund.returnOneYear.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {fund.changeDaily !== null ? (
                            <span
                              className={`flex items-center justify-end gap-0.5 ${fund.changeDaily > 0 ? "text-red-500" : fund.changeDaily < 0 ? "text-emerald-500" : ""}`}
                            >
                              {fund.changeDaily > 0 ? "+" : ""}
                              {fund.changeDaily.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge
                            variant={isSuspended ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {fund.purchaseStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                          {fund.purchaseLimit}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/cn/fund?code=${fund.code}`}
                              className="inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              title="分析"
                            >
                              <TrendingUp className="size-3" />
                              <span className="hidden lg:inline">分析</span>
                            </Link>
                            <motion.button
                              onClick={() => toggleCompare(fund.code)}
                              whileTap={{ scale: 0.9 }}
                              transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                              aria-pressed={isSelected}
                              title={isSelected ? "已加入对比" : "加入对比"}
                              className={`inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="size-3" />
                                  <span className="hidden lg:inline">已加入</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="size-3" />
                                  <span className="hidden lg:inline">对比</span>
                                </>
                              )}
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </section>
  );
}

/** QDII 表格可排序表头 */
function QDIIThSortable({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: QDIISortField;
  current: QDIISortField;
  dir: QDIISortDir;
  onSort: (f: QDIISortField) => void;
}) {
  const isActive = current === field;
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {isActive ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </button>
    </th>
  );
}

/**
 * Segmented control 风格筛选器
 * 浅色背景容器 + 激活态用白底 + 微妙阴影，文案与 count 分两层排版
 */
function SegmentedFilter<K extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: K;
  onChange: (v: K) => void;
  options: { key: K; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border bg-muted/40 p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`rounded-[3px] px-1.5 py-1 text-[11px] whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
            {typeof opt.count === "number" && (
              <span
                className={`ml-1 hidden text-[10px] sm:inline ${active ? "text-muted-foreground" : "opacity-60"}`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ==================== Footer ==================== */

function Footer({ fetchedAt }: { fetchedAt: string }) {
  const time = new Date(fetchedAt);
  const timeStr = time.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container mx-auto max-w-6xl px-3 text-center text-xs text-muted-foreground sm:px-4">
        <p className="mb-2">ETFVoid · 美股ETF与QDII基金追踪平台</p>
        <p className="mb-1">
          数据更新于 {timeStr} · 数据来源: 新浪财经 / CBOE / multpl.com / 东方财富（天天基金）
        </p>
        <p>数据仅供参考，不构成投资建议。历史规律不能预测未来，投资有风险，入市需谨慎。</p>
      </div>
    </footer>
  );
}

/* ==================== 通用组件 ==================== */

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-lg font-semibold tracking-tight md:mb-4 md:text-xl">{title}</h2>;
}

/* ==================== 工具函数 ==================== */

/** 格式化涨跌幅 */
function formatChange(value: number | null): string {
  if (value === null || value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

/** 判断涨跌趋势 */
function getTrend(value: number | null): "up" | "down" | "neutral" {
  if (value === null || value === 0) return "neutral";
  return value > 0 ? "up" : "down";
}

/** VIX 等级判定 */
function getVixLevel(vix: number) {
  if (vix <= 15) return { label: "市场平静", badgeVariant: "secondary" as const };
  if (vix <= 20) return { label: "正常波动", badgeVariant: "secondary" as const };
  if (vix <= 25) return { label: "市场警惕", badgeVariant: "destructive" as const };
  return { label: "极度恐慌", badgeVariant: "destructive" as const };
}

/** 恐慌贪婪等级 */
function getFearGreedLevel(score: number) {
  if (score <= 25) return { label: "极度恐慌", badgeVariant: "destructive" as const };
  if (score <= 45) return { label: "恐慌", badgeVariant: "destructive" as const };
  if (score <= 55) return { label: "中性", badgeVariant: "secondary" as const };
  if (score <= 75) return { label: "贪婪", badgeVariant: "default" as const };
  return { label: "极度贪婪", badgeVariant: "default" as const };
}

/** PE 分位等级 */
function getPeLevel(percentile: number | null) {
  if (percentile === null) return { label: "数据缺失", badgeVariant: "secondary" as const };
  if (percentile <= 20) return { label: "低估", badgeVariant: "secondary" as const };
  if (percentile <= 40) return { label: "合理偏低", badgeVariant: "secondary" as const };
  if (percentile <= 60) return { label: "合理", badgeVariant: "secondary" as const };
  if (percentile <= 80) return { label: "偏高", badgeVariant: "destructive" as const };
  return { label: "极度高估", badgeVariant: "destructive" as const };
}

/** 根据PE值估算历史分位（基于标普500历史PE分布） */
function estimatePePercentile(pe: number): number {
  // 标普500 PE历史中位数约16-17，当前偏高
  // 使用简化的正态分布估算
  const median = 17;
  const stdDev = 6;
  // 简化的累积分布函数估算
  const z = (pe - median) / stdDev;
  const percentile = Math.round(normalCDF(z) * 100);
  return Math.max(0, Math.min(100, percentile));
}

/** 根据PE值估算纳指100历史分位（基于纳指100历史PE分布） */
function estimateNasdaq100PePercentile(pe: number): number {
  // 纳指100 PE历史中位数约24.5，长期均值约28.77
  // 标准差约5.4（基于20年数据）
  const median = 24.5;
  const stdDev = 5.4;
  const z = (pe - median) / stdDev;
  const percentile = Math.round(normalCDF(z) * 100);
  return Math.max(0, Math.min(100, percentile));
}

/** 标准正态分布累积分布函数近似 */
function normalCDF(z: number): number {
  // Abramowitz and Stegun 近似
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** 综合温度标签 */
function getTemperatureLabel(score: number): string {
  if (score <= 25) return "极度恐慌·机会区";
  if (score <= 40) return "偏冷·可布局";
  if (score <= 60) return "中性偏谨慎";
  if (score <= 75) return "偏热·注意风险";
  return "极度贪婪·危险区";
}

/** 综合温度颜色 */
function getTemperatureColor(score: number): string {
  if (score <= 25) return "text-emerald-500";
  if (score <= 40) return "text-emerald-400";
  if (score <= 60) return "text-amber-500";
  if (score <= 75) return "text-orange-500";
  return "text-red-500";
}
