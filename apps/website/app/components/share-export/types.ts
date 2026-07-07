import type { ComponentType, CSSProperties } from "react";
import type { Gauge, LineChart, Trophy } from "lucide-react";
import type { FundDetailData } from "~/lib/market-data";

export type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

export type ModuleKey = "fund-detail" | "fund-compare" | "analysis";

export interface ModuleTheme {
  title: string;
  subtitle: string;
  primary: string;
  gradientEnd: string;
  accent: string;
  source: string;
  Icon: IconComponent;
}

export type ExportPayload =
  | { module: "fund-detail"; data: FundDetailExportData }
  | { module: "fund-compare"; data: FundCompareExportData }
  | { module: "analysis"; data: AnalysisExportData };

export interface FundDetailExportData {
  fund: FundDetailData;
}

export interface FundCompareExportData {
  funds: Array<FundDetailData & { error?: string }>;
}

export interface AnalysisExportData {
  fund: FundDetailData;
}

export type { Gauge, LineChart, Trophy };
