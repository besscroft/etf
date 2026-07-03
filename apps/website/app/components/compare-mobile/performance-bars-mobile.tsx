import { Trophy } from "lucide-react";
import type { FundDetailData } from "~/lib/market-data";
import { PerformanceReturnsChart } from "~/components/charts";

interface PerformanceBarsMobileProps {
  funds: Array<FundDetailData & { error?: string }>;
}

export function PerformanceBarsMobile({ funds }: PerformanceBarsMobileProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Trophy className="size-4 text-amber-500" />
        阶段收益对比
      </div>
      <PerformanceReturnsChart funds={funds} detailHref={(code) => `/fund/${code}`} height={260} />
    </div>
  );
}
