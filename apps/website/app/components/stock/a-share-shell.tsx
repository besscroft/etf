import * as React from "react";
import { BarChart3, Layers3, Search, Star, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import { ThemeMenu } from "~/components/theme";
import { Button } from "~/components/ui/button";
import { AppLink as Link } from "~/components/ui/link";
import { cn } from "~/lib/utils";
import { formatPercent, formatPrice, trendClass } from "~/lib/format-ashare";
import { getMarketPhase } from "~/lib/stock-market";
import type { AShareSearchResponse, StockSearchItem } from "~/lib/stock-data";

const NAV_ITEMS = [
  { href: "/a-shares", label: "A 股行情", icon: BarChart3 },
  { href: "/watchlist", label: "自选股", icon: Star },
  { href: "/sectors", label: "板块", icon: Layers3 },
];

const PHASE_LABEL = {
  preopen: "盘前",
  open: "交易中",
  lunch: "午间休市",
  closed: "已收盘",
} as const;

export function AShareShell({
  children,
  currentLabel,
  pullOffset = 0,
}: {
  children: React.ReactNode;
  currentLabel?: string;
  pullOffset?: number;
}) {
  const location = useLocation();
  const phase = getMarketPhase();

  return (
    <div className="market-workspace min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="返回首页">
            <span className="flex size-7 items-center justify-center border border-primary/50 bg-primary/10 text-primary">
              <BarChart3 className="size-3.5" strokeWidth={1.8} />
            </span>
            <span className="hidden text-sm font-semibold sm:inline">ETFVoid</span>
            <span className="hidden text-muted-foreground sm:inline">/</span>
            <span className="text-sm font-medium">{currentLabel ?? "A 股工作台"}</span>
          </Link>

          <MarketSearch className="ml-auto hidden max-w-md flex-1 md:block" />

          <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="A 股导航">
            {NAV_ITEMS.map((item) => {
              const active =
                location.pathname === item.href ||
                (item.href === "/a-shares" && location.pathname.startsWith("/stock/"));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex h-8 items-center gap-1.5 px-2.5 text-xs transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={1.7} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <span
            className={cn(
              "hidden shrink-0 items-center gap-1.5 font-mono text-[11px] sm:flex",
              phase === "open" ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span
              className={cn("size-1.5", phase === "open" ? "bg-primary" : "bg-muted-foreground")}
            />
            {PHASE_LABEL[phase]}
          </span>
          <ThemeMenu />
        </div>

        <div className="mx-auto flex max-w-[1600px] items-center gap-2 border-t border-border/60 px-3 py-2 md:hidden">
          <MarketSearch className="min-w-0 flex-1" />
          <nav className="flex shrink-0" aria-label="移动端 A 股导航">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.href} asChild variant="ghost" size="icon-sm">
                  <Link to={item.href} aria-label={item.label}>
                    <Icon className="size-4" strokeWidth={1.7} />
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-[1600px] px-3 py-4 transition-transform sm:px-5 lg:py-5"
        style={{ transform: pullOffset > 0 ? `translateY(${pullOffset}px)` : undefined }}
      >
        {children}
      </main>
    </div>
  );
}

function MarketSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<StockSearchItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed, limit: "8" });
        const response = await fetch(`/api/a-share-search?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as AShareSearchResponse;
        setResults(data.results);
        setActiveIndex(0);
        setOpen(true);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const select = (item: StockSearchItem) => {
    setOpen(false);
    setQuery("");
    void navigate(`/stock/${item.code}`);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((value) => Math.min(results.length - 1, value + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((value) => Math.max(0, value - 1));
          } else if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault();
            select(results[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="搜索代码、名称或拼音"
        aria-label="搜索 A 股"
        aria-expanded={open}
        aria-controls="market-search-results"
        className="h-8 w-full border border-border bg-muted/40 pl-8 pr-8 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/70 focus:bg-background"
      />
      {loading ? (
        <span className="absolute right-2.5 top-1/2 size-3 -translate-y-1/2 animate-spin border border-muted-foreground border-t-transparent" />
      ) : query ? (
        <button
          type="button"
          aria-label="清空搜索"
          onClick={() => setQuery("")}
          className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      ) : null}

      {open ? (
        <div
          id="market-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto border border-border bg-popover p-1 shadow-2xl"
        >
          {results.length === 0 ? (
            <p className="px-3 py-5 text-center text-xs text-muted-foreground">没有匹配的 A 股</p>
          ) : (
            results.map((item, index) => (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(item)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2.5 py-2 text-left",
                  index === activeIndex ? "bg-muted" : "hover:bg-muted/70",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{item.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{item.code}</span>
                </span>
                <span className="text-right font-mono text-xs">
                  <span className="block">{formatPrice(item.price)}</span>
                  <span className={trendClass(item.changePercent)}>
                    {formatPercent(item.changePercent)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
