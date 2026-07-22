import { AnimatePresence, motion } from "motion/react";
import { BarChart3, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { AppLink as Link } from "~/components/ui/link";
import type { OTCClassifiedFundData } from "~/lib/market-data";

interface FundCompareDockProps {
  funds: OTCClassifiedFundData[];
  max: number;
  onRemove: (code: string) => void;
  selectedCodes: string[];
}

export function FundCompareDock({ funds, max, onRemove, selectedCodes }: FundCompareDockProps) {
  const selected = selectedCodes.flatMap((code) => {
    const fund = funds.find((item) => item.code === code);
    return fund ? [fund] : [];
  });
  const compareHref = `/cn/funds?funds=${selectedCodes.join(",")}`;
  const canCompare = selectedCodes.length >= 2;

  return (
    <AnimatePresence>
      {selectedCodes.length > 0 ? (
        <motion.aside
          aria-label="基金对比选择"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 z-50 border bg-popover/96 p-3 text-popover-foreground shadow-xl backdrop-blur-md md:inset-x-auto md:right-5 md:w-[360px]"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <BarChart3 className="size-4 shrink-0 text-primary" />
              <span className="text-sm font-semibold">基金对比</span>
              <span className="font-mono text-xs text-muted-foreground">
                {selectedCodes.length}/{max}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedCodes.length >= max
                ? "已达上限"
                : `还可添加 ${max - selectedCodes.length} 只`}
            </span>
          </div>

          <div className="mt-2 flex max-w-full gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
            {selected.map((fund) => (
              <div
                key={fund.code}
                className="flex min-w-0 shrink-0 items-center gap-1 border bg-background px-2 py-1 text-xs md:max-w-full"
              >
                <span className="max-w-32 truncate font-medium">{fund.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{fund.code}</span>
                <button
                  type="button"
                  onClick={() => onRemove(fund.code)}
                  className="ml-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`移除 ${fund.name}`}
                  title="移出对比"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2">
            {canCompare ? (
              <Button asChild size="sm" className="w-full">
                <Link to={compareHref}>
                  <BarChart3 className="size-4" />
                  开始对比
                </Link>
              </Button>
            ) : (
              <Button type="button" size="sm" className="w-full" disabled>
                再选择 1 只基金
              </Button>
            )}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
