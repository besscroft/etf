import { LineChart } from "lucide-react";
import type { FundDetailData } from "~/lib/market-data";
import { FundCompareChart } from "~/components/charts";

type RangeKey = "3m" | "6m" | "1y" | "all";

interface TrendChartMobileProps {
  funds: Array<FundDetailData & { error?: string }>;
  detailHref?: (code: string) => string;
}

export function TrendChartMobile({
  funds,
  detailHref = (code) => `/otc-fund?code=${code}`,
}: TrendChartMobileProps) {
  const defaultRange: RangeKey = "1y";
  const fundsWithData = funds.filter((fund) => !fund.error && fund.navTrend?.length >= 2);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <LineChart className="size-4 text-blue-500" />
        净值走势对比
      </div>
      <FundCompareChart
        funds={fundsWithData}
        defaultRange={defaultRange}
        detailHref={detailHref}
        height={240}
        showRangeControls={false}
      />
    </div>
  );
}
