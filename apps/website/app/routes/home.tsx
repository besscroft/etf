import type { Route } from "./+types/home";
import { useLoaderData, useNavigate } from "react-router";
import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Layers,
  Search,
  Wallet,
} from "lucide-react";
import { AppHeader } from "~/components/app-header";
import { AppLink as Link } from "~/components/ui/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { AsyncSection } from "~/components/ui/async-section";
import { buildMeta } from "~/lib/seo";
import {
  getDomesticHomeData,
  type DomesticHomeData,
  type DomesticQuoteItem,
} from "~/lib/domestic-market";
import type { OTCClassifiedFundData } from "~/lib/market-data";

export function meta(_args: Route.MetaArgs) {
  return buildMeta({
    title: "大 A 股票、场内 ETF 与场外基金观察工具",
    description:
      "面向国内投资者的 ETFVoid，聚焦 A 股行情、场内 ETF 和场外基金对比，提供精选行情、基金筛选与详情分析。",
    path: "/",
    type: "website",
  });
}

export async function loader() {
  return {
    data: getDomesticHomeData(),
  };
}

export default function Home() {
  const { data } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-5 lg:pb-16">
        <AsyncSection resolve={data} fallback={<HomeSkeleton />}>
          {(resolved) => <HomeContent data={resolved as DomesticHomeData} />}
        </AsyncSection>
      </main>
    </div>
  );
}

function HomeContent({ data }: { data: DomesticHomeData }) {
  return (
    <>
      <Hero data={data} />
      <MarketStrip quotes={[...data.stockHighlights, ...data.etfHighlights.slice(0, 4)]} />
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <AshareSection quotes={data.stockHighlights} />
        <ETFSection quotes={data.etfHighlights} />
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ToolboxSection />
        <OTCFundSection funds={data.otcHighlights} fetchedAt={data.fetchedAt} />
      </section>
      <Footer fetchedAt={data.fetchedAt} />
    </>
  );
}

function Hero({ data }: { data: DomesticHomeData }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const topETF = data.etfHighlights.slice(0, 4);

  const normalizedCode = useMemo(() => query.replace(/\D/g, "").slice(0, 6), [query]);

  const goTo = (target: "stock" | "fund") => {
    if (!/^\d{6}$/.test(normalizedCode)) return;
    void navigate(target === "stock" ? `/stock/${normalizedCode}` : `/fund/${normalizedCode}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goTo("stock");
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="rounded-lg border bg-card p-5 md:p-8">
        <Badge variant="secondary" className="mb-5 rounded-md">
          ETFVoid 国内投资观察
        </Badge>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          大 A 投资中枢
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
          聚焦 A 股、场内 ETF 和场外基金，用更少噪声看清价格、风格和可比基金。
        </p>

        <form onSubmit={handleSubmit} className="mt-7 rounded-lg border bg-background/70 p-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="输入 6 位股票、ETF 或基金代码"
                className="h-11 w-full rounded-md border bg-card pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <Button
              type="submit"
              className="h-11 rounded-md"
              disabled={!/^\d{6}$/.test(normalizedCode)}
            >
              查股票/ETF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md"
              disabled={!/^\d{6}$/.test(normalizedCode)}
              onClick={() => goTo("fund")}
            >
              查基金
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">场内 ETF 快速盘面</p>
            <p className="text-xs text-muted-foreground">宽基与主题的即时温度</p>
          </div>
          <Link to="/etf" className="text-sm text-primary hover:underline">
            全部 ETF
          </Link>
        </div>
        <div className="grid gap-2">
          {topETF.map((quote) => (
            <QuoteRow key={quote.code} quote={quote} dense />
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketStrip({ quotes }: { quotes: DomesticQuoteItem[] }) {
  return (
    <section className="mt-5 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-3 overflow-x-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {quotes.map((quote) => (
          <Link
            key={`${quote.kind}-${quote.code}`}
            to={`/stock/${quote.code}`}
            className="min-w-[11rem] rounded-md border bg-background/60 px-3 py-2 transition-colors hover:border-primary/70"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{quote.displayName}</span>
              <span className={`font-mono text-sm ${trendClass(quote.changePercent)}`}>
                {formatPercent(quote.changePercent, quote.price)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">{quote.code}</span>
              <span>{formatPrice(quote.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AshareSection({ quotes }: { quotes: DomesticQuoteItem[] }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="p-4 md:p-5">
        <SectionHead icon={Activity} title="A 股观察" href="/a-shares" />
        <div className="mt-4 grid gap-2">
          {quotes.map((quote) => (
            <QuoteRow key={quote.code} quote={quote} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ETFSection({ quotes }: { quotes: DomesticQuoteItem[] }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="p-4 md:p-5">
        <SectionHead icon={Layers} title="场内 ETF" href="/etf" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {quotes.slice(0, 6).map((quote) => (
            <Link
              key={quote.code}
              to={`/stock/${quote.code}`}
              className="rounded-md border bg-background/60 p-3 transition-colors hover:border-primary/70"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{quote.displayName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{quote.code}</span>
                </span>
                <Badge variant="secondary" className="shrink-0 rounded-md text-[10px]">
                  {quote.theme}
                </Badge>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="font-mono text-lg font-semibold">{formatPrice(quote.price)}</span>
                <span className={`font-mono text-sm ${trendClass(quote.changePercent)}`}>
                  {formatPercent(quote.changePercent, quote.price)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OTCFundSection({
  funds,
  fetchedAt,
}: {
  funds: OTCClassifiedFundData[];
  fetchedAt: string;
}) {
  const time = new Date(fetchedAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="p-4 md:p-5">
        <SectionHead icon={Wallet} title="场外基金精选" href="/otc-funds" />
        <div className="mt-4 grid gap-2">
          {funds.map((fund) => (
            <Link
              key={`${fund.category}-${fund.code}`}
              to={`/fund/${fund.code}`}
              className="grid gap-3 rounded-md border bg-background/60 p-3 transition-colors hover:border-primary/70 sm:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{fund.code}</span>
                  <Badge variant="secondary" className="rounded-md text-[10px]">
                    {fund.categoryLabel}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm font-medium">{fund.name}</p>
              </div>
              <div className="flex items-end justify-between gap-6 sm:block sm:text-right">
                <p
                  className={`font-mono text-base font-semibold ${trendClass(fund.returnOneYear ?? 0)}`}
                >
                  {fund.returnOneYear !== null
                    ? `${fund.returnOneYear > 0 ? "+" : ""}${fund.returnOneYear.toFixed(2)}%`
                    : "待更新"}
                </p>
                <p className="text-xs text-muted-foreground">近 1 年</p>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">更新时间 {time}</p>
      </CardContent>
    </Card>
  );
}

function ToolboxSection() {
  const tools = [
    {
      title: "A股行情",
      body: "从代表性个股看市场风格。",
      href: "/a-shares",
      icon: Activity,
    },
    {
      title: "场内ETF",
      body: "宽基和主题 ETF 快速对照。",
      href: "/etf",
      icon: Layers,
    },
    {
      title: "基金对比",
      body: "把场外基金放在同一张图里看。",
      href: "/cn/funds",
      icon: BarChart3,
    },
    {
      title: "场外基金",
      body: "按分类筛选可申购基金。",
      href: "/otc-funds",
      icon: Wallet,
    },
  ];

  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="p-4 md:p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">投资工具入口</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            常用流程收在一屏，手机端也能顺手操作。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                to={tool.href}
                className={`group rounded-md border bg-background/60 p-4 transition-colors hover:border-primary/70 ${
                  index === 0 ? "sm:col-span-2" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md border bg-card text-primary">
                    <Icon className="size-4" />
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{tool.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tool.body}</p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHead({
  icon: Icon,
  title,
  href,
}: {
  icon: typeof Activity;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md border bg-background text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <Link
        to={href}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        查看
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function QuoteRow({ quote, dense = false }: { quote: DomesticQuoteItem; dense?: boolean }) {
  return (
    <Link
      to={`/stock/${quote.code}`}
      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/70"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{quote.displayName}</span>
          {!dense && (
            <Badge variant="secondary" className="rounded-md text-[10px]">
              {quote.theme}
            </Badge>
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground">{quote.code}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-base font-semibold">{formatPrice(quote.price)}</p>
        <p className={`font-mono text-xs ${trendClass(quote.changePercent)}`}>
          {formatPercent(quote.changePercent, quote.price)}
        </p>
      </div>
    </Link>
  );
}

function Footer({ fetchedAt }: { fetchedAt: string }) {
  const time = new Date(fetchedAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <footer className="mt-10 border-t pt-6 text-center text-xs leading-6 text-muted-foreground">
      <p>ETFVoid 聚焦 A 股、场内 ETF 与场外基金。</p>
      <p>数据更新于 {time}，内容仅供参考，不构成投资建议。</p>
    </footer>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-24 animate-pulse rounded-lg border bg-muted/40 lg:col-span-2" />
    </div>
  );
}

function formatPrice(value: number) {
  return value > 0 ? value.toFixed(2) : "待更新";
}

function formatPercent(value: number, hasData: number | boolean) {
  if (!hasData) return "待更新";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function trendClass(value: number) {
  if (value > 0) return "text-[color:var(--market-up)]";
  if (value < 0) return "text-[color:var(--market-down)]";
  return "text-muted-foreground";
}
