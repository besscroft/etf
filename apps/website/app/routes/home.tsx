import type { Route } from "./+types/home";
import { useLoaderData, Link } from "react-router";
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
  Shield,
  ArrowRight,
  Activity,
  Gauge,
  LineChart,
  Menu,
  X,
  RefreshCw,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  GitCompare,
  TrendingUp,
} from "lucide-react";
import { getMarketData, type MarketData } from "~/lib/market-data";
import { useState, useMemo, useEffect, useRef } from "react";
import { useMotionConfig, fadeInDown, DURATION, EASING, DISTANCE } from "~/lib/motion";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "ETFVoid - 美股ETF与QDII基金追踪平台" },
    {
      name: "description",
      content:
        "覆盖纳斯达克100、标普500被动指数及主动型QDII基金，提供费率对比、溢价监控与申购状态追踪。",
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
  // 对比列表：存储已选基金的 code
  const [compareList, setCompareList] = useState<string[]>([]);

  const toggleCompare = (code: string) => {
    setCompareList((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <main className="container mx-auto max-w-6xl px-3 pb-16 sm:px-4">
        <HeroSection data={data} />
        <MarketIndicators data={data} />
        <MarketTemperature data={data} />
        <ToolboxSection />
        <PremiumAlertSection
          data={data}
          compareList={compareList}
          onToggleCompare={toggleCompare}
        />
      </main>
      <Footer fetchedAt={data.fetchedAt} />
      {/* 浮动对比卡片：AnimatePresence 实现入场/退场动画 */}
      <AnimatePresence>
        <CompareFloatBar
          compareList={compareList}
          etfList={data.etfPremium}
          onRemove={toggleCompare}
        />
      </AnimatePresence>
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
    { label: "场内ETF", href: "/etf" },
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

        {/* 移动端菜单按钮：图标切换动画 */}
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
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: DURATION.fast, ease: EASING.easeInOut }}
              >
                <X className="size-5" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
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
  const avgPremium =
    data.etfPremium.length > 0
      ? Math.round(
          (data.etfPremium.reduce((s, e) => s + e.premium, 0) / data.etfPremium.length) * 10,
        ) / 10
      : 0;

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
        <StaggerItem>
          <MetricCard
            label="ETF均溢价"
            numericValue={avgPremium}
            suffix="%"
            sub="当前"
            trend="neutral"
            warning={avgPremium > 2}
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
      ? "text-emerald-500"
      : trend === "down"
        ? "text-red-500"
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

  return (
    <section className="mb-8 md:mb-10">
      <SectionTitle title="市场情绪指标" />
      <StaggerContainer
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4"
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
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4"
        stagger={0.1}
        inView
      >
        <StaggerItem>
          <ToolCard
            icon={<Search className="size-5" />}
            title="基金对比"
            description="净值趋势、阶段收益、费率、风险（波动/回撤）、持仓与基金经理履历一览"
            href="/cn/funds"
          />
        </StaggerItem>
        <StaggerItem>
          <ToolCard
            icon={<BarChart3 className="size-5" />}
            title="基金分析"
            description="单基金深度分析：净值走势、全周期收益、最大回撤、月度热力图与经理履历"
            href="/cn/fund"
          />
        </StaggerItem>
        <StaggerItem>
          <ToolCard
            icon={<Shield className="size-5" />}
            title="稳健收益"
            description="全球国债、投资级公司债与REITs，信用评级、最大回撤与入场指南"
            href="/global/stable"
            extra="美国国债 4.8% vs 国内存款 1.45%"
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
      <CardHeader>
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
      <CardContent className="mt-auto">
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
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={href}>
              进入
              <ArrowRight className="ml-1 size-3" />
            </a>
          </Button>
        )}
      </CardContent>
    </MotionCard>
  );
}

/* ==================== ETF 溢价预警 ==================== */

/** 排序字段类型 */
type SortField = "premium" | "changePercent" | "name" | "code" | "scale";
type SortDir = "asc" | "desc";

function PremiumAlertSection({
  data,
  compareList,
  onToggleCompare,
}: {
  data: MarketData;
  compareList: string[];
  onToggleCompare: (code: string) => void;
}) {
  const etfList = data.etfPremium;
  const [sortField, setSortField] = useState<SortField>("premium");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  // 搜索过滤
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return etfList;
    const q = searchQuery.trim().toLowerCase();
    return etfList.filter(
      (e) => e.code.toLowerCase().includes(q) || e.name.toLowerCase().includes(q),
    );
  }, [etfList, searchQuery]);

  // 排序
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      switch (sortField) {
        case "premium":
          va = a.premium;
          vb = b.premium;
          break;
        case "changePercent":
          va = a.changePercent;
          vb = b.changePercent;
          break;
        case "name":
          va = a.name;
          vb = b.name;
          break;
        case "code":
          va = a.code;
          vb = b.code;
          break;
        case "scale":
          // 从规模字符串提取数字（如"12.3亿"→12.3）
          va = parseFloat(a.scale) || 0;
          vb = parseFloat(b.scale) || 0;
          break;
        default:
          va = a.premium;
          vb = b.premium;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return list;
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // 溢价率和涨跌幅默认降序，名称和代码默认升序
      setSortDir(field === "name" || field === "code" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 inline size-3 opacity-30" />;
    }
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline size-3" />
    ) : (
      <ChevronDown className="ml-1 inline size-3" />
    );
  };

  return (
    <section className="mb-8 md:mb-10">
      <SectionTitle title="ETF 溢价预警" />

      {/* 搜索栏 */}
      <FadeIn className="mb-3 flex items-center gap-2 md:mb-4" delay={0.1}>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索基金代码或名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <AnimatePresence>
          {searchQuery && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              {filtered.length}/{etfList.length} 只
            </motion.span>
          )}
        </AnimatePresence>
      </FadeIn>

      <p className="mb-3 text-xs text-muted-foreground md:mb-4">
        溢价 &gt;1% 注意 · &gt;2% 偏高 · &gt;3% 极高建议等待收窄
        {searchQuery && filtered.length === 0 && " · 未找到匹配基金"}
      </p>

      <AnimatePresence mode="wait">
        {etfList.length === 0 ? (
          <motion.div
            key="empty-data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
          >
            <Card>
              <CardContent className="py-8 text-center">
                <RefreshCw className="mx-auto mb-2 size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">暂时无法获取ETF溢价数据，请稍后刷新</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty-search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
          >
            <Card>
              <CardContent className="py-8 text-center">
                <Search className="mx-auto mb-2 size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">未找到匹配 "{searchQuery}" 的基金</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
          >
            <Card>
              <CardContent className="p-0">
                {/* 桌面端表格 */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th
                          className="cursor-pointer px-4 py-3 text-left font-medium select-none hover:text-foreground"
                          onClick={() => toggleSort("code")}
                        >
                          代码 <SortIcon field="code" />
                        </th>
                        <th
                          className="cursor-pointer px-4 py-3 text-left font-medium select-none hover:text-foreground"
                          onClick={() => toggleSort("name")}
                        >
                          名称 <SortIcon field="name" />
                        </th>
                        <th className="px-4 py-3 text-left font-medium">跟踪指数</th>
                        <th
                          className="cursor-pointer px-4 py-3 text-right font-medium select-none hover:text-foreground"
                          onClick={() => toggleSort("premium")}
                        >
                          溢价率 <SortIcon field="premium" />
                        </th>
                        <th
                          className="cursor-pointer px-4 py-3 text-right font-medium select-none hover:text-foreground"
                          onClick={() => toggleSort("changePercent")}
                        >
                          涨跌幅 <SortIcon field="changePercent" />
                        </th>
                        <th
                          className="cursor-pointer px-4 py-3 text-right font-medium select-none hover:text-foreground"
                          onClick={() => toggleSort("scale")}
                        >
                          规模 <SortIcon field="scale" />
                        </th>
                        <th className="px-4 py-3 text-center font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((row) => (
                        <tr
                          key={row.code}
                          className="border-b last:border-b-0 transition-colors hover:bg-muted/50"
                        >
                          <td className="px-4 py-3 font-mono text-xs">
                            <Link to={`/fund/${row.code}`} className="text-primary hover:underline">
                              {row.code}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <Link
                              to={`/fund/${row.code}`}
                              className="hover:text-primary hover:underline"
                            >
                              {row.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{row.index}</td>
                          <td className="px-4 py-3 text-right">
                            <PremiumBadge value={row.premium} />
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-xs ${
                              row.changePercent > 0
                                ? "text-emerald-500"
                                : row.changePercent < 0
                                  ? "text-red-500"
                                  : ""
                            }`}
                          >
                            {formatChange(row.changePercent)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                            {row.scale}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                to={`/cn/fund?code=${row.code}`}
                                className="inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                title="分析"
                              >
                                <TrendingUp className="size-3" />
                                <span className="hidden lg:inline">分析</span>
                              </Link>
                              <motion.button
                                onClick={() => onToggleCompare(row.code)}
                                whileTap={{ scale: 0.9 }}
                                transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                                className={`inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs transition-colors ${
                                  compareList.includes(row.code)
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                }`}
                                title={compareList.includes(row.code) ? "移除对比" : "加入对比"}
                              >
                                <GitCompare className="size-3" />
                                <span className="hidden lg:inline">
                                  {compareList.includes(row.code) ? "已选" : "对比"}
                                </span>
                              </motion.button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 移动端卡片列表：layout 动画实现排序/过滤平滑过渡 */}
                <motion.div layout className="md:hidden">
                  <AnimatePresence initial={false}>
                    {sorted.map((row) => (
                      <motion.div
                        key={row.code}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                          duration: DURATION.normal,
                          ease: EASING.easeOut,
                        }}
                        className="block overflow-hidden border-b last:border-b-0 px-3 py-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground">
                              {row.code}
                            </span>
                            <span className="ml-2 text-sm">{row.name}</span>
                          </div>
                          <PremiumBadge value={row.premium} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{row.index}</span>
                          <span>
                            涨跌{" "}
                            <span
                              className={
                                row.changePercent > 0
                                  ? "text-emerald-500"
                                  : row.changePercent < 0
                                    ? "text-red-500"
                                    : ""
                              }
                            >
                              {formatChange(row.changePercent)}
                            </span>
                            {" · "}
                            规模 {row.scale}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Link
                            to={`/cn/fund?code=${row.code}`}
                            className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <TrendingUp className="size-3" />
                            分析
                          </Link>
                          <motion.button
                            onClick={() => onToggleCompare(row.code)}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                            className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs transition-colors ${
                              compareList.includes(row.code)
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            }`}
                          >
                            <GitCompare className="size-3" />
                            {compareList.includes(row.code) ? "已选" : "对比"}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PremiumBadge({ value }: { value: number }) {
  if (value >= 3) {
    return (
      <Badge variant="destructive" className="text-xs">
        +{value}% 极高
      </Badge>
    );
  }
  if (value >= 2) {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 text-xs dark:bg-amber-500/20 dark:text-amber-400">
        +{value}% 偏高
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">
      +{value}%
    </Badge>
  );
}

/* ==================== 浮动对比卡片 ==================== */

function CompareFloatBar({
  compareList,
  etfList,
  onRemove,
}: {
  compareList: string[];
  etfList: Array<{ code: string; name: string }>;
  onRemove: (code: string) => void;
}) {
  const { shouldReduceMotion } = useMotionConfig();

  if (compareList.length === 0) return null;

  const selectedFunds = compareList
    .map((code) => etfList.find((e) => e.code === code))
    .filter(Boolean) as Array<{ code: string; name: string }>;

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50 max-w-xs"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
    >
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium">已选对比 ({compareList.length})</span>
          <Link
            to={`/cn/funds?funds=${compareList.join(",")}`}
            className="inline-flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <GitCompare className="size-3" />
            开始对比
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selectedFunds.map((fund) => (
            <Badge key={fund.code} variant="secondary" className="gap-1 text-xs">
              <span className="max-w-[80px] truncate">{fund.name}</span>
              <button onClick={() => onRemove(fund.code)} className="ml-0.5 hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
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
          数据更新于 {timeStr} · 数据来源: 新浪财经 / CBOE / multpl.com / 东方财富
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
