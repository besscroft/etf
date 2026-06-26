/**
 * 图片导出分享 - 类型定义
 *
 * 各功能模块通过 module 标识自己的专属导出样式，
 * 由 ShareExport 主组件分发到对应模板渲染。
 */
import type { ComponentType, CSSProperties } from "react";
import type { BarChart3, Shield, Activity, LineChart, Trophy, Gauge, Users } from "lucide-react";
import type {
  OTCFundData,
  QDIIFundData,
  FundDetailData,
  QDIIValuationData,
  MarketSession,
} from "~/lib/market-data";

/** 图标组件类型：支持 className 与内联 style（用于导出卡片固定尺寸） */
export type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

/** 全部支持专用导出的功能模块 */
export type ModuleKey =
  | "nasdaq"
  | "sp500"
  | "active"
  | "qdii"
  | "valuation"
  | "fund-detail"
  | "fund-compare"
  | "stable"
  | "analysis";

/** 模块主题配置：色彩 / 标题 / 数据来源 */
export interface ModuleTheme {
  /** 模块标题（中文） */
  title: string;
  /** 模块副标题 */
  subtitle: string;
  /** 主色（hex），用于 Header 渐变与重点强调 */
  primary: string;
  /** 渐变色终点色（hex），与 primary 形成 45° 渐变 */
  gradientEnd: string;
  /** 强调色（hex），用于数据高亮 */
  accent: string;
  /** 数据来源描述 */
  source: string;
  /** 模块图标组件 */
  Icon: IconComponent;
}

/** 各模块对应的导出数据载体 */
export type ExportPayload =
  | { module: "nasdaq" | "sp500" | "active"; data: FundListExportData }
  | { module: "qdii"; data: QDIIFundListExportData }
  | { module: "valuation"; data: ValuationExportData }
  | { module: "fund-detail"; data: FundDetailExportData }
  | { module: "fund-compare"; data: FundCompareExportData }
  | { module: "stable"; data: StableExportData }
  | { module: "analysis"; data: AnalysisExportData };

/** 基金列表类（纳指/标普/主动）导出数据 */
export interface FundListExportData {
  /** 模块标题 */
  moduleTitle: string;
  /** 行情更新时间 ISO 字符串 */
  fetchedAt: string;
  /** 当前筛选状态描述（如 "仅开放申购"），可选 */
  filterLabel?: string;
  /** 基金列表 */
  funds: OTCFundData[];
}

/** QDII 一览导出数据（带分类） */
export interface QDIIFundListExportData extends FundListExportData {
  funds: QDIIFundData[];
}

/** QDII 估值导出数据 */
export interface ValuationExportData {
  fetchedAt: string;
  /** 当前市场时段 */
  session: MarketSession;
  /** 估值列表 */
  funds: QDIIValuationData[];
}

/** 基金详情导出数据 */
export interface FundDetailExportData {
  fund: FundDetailData;
}

/** 基金对比导出数据 */
export interface FundCompareExportData {
  funds: Array<FundDetailData & { error?: string }>;
}

/** 稳健收益产品（与 stable.tsx 内部结构对齐） */
export interface StableProductExport {
  market: string;
  type: string;
  name: string;
  annualYield: number;
  maxDrawdown: number;
  years: number;
  rating: string;
  entry: string;
  marketTag: "cn" | "us" | "global";
}

/** 稳健收益导出数据 */
export interface StableExportData {
  products: StableProductExport[];
}

/** 基金分析导出数据 */
export interface AnalysisExportData {
  fund: FundDetailData;
}

// 引入类型仅为让 ModuleTheme.Icon 在使用方有完整类型推导
export type { BarChart3, Shield, Activity, LineChart, Trophy, Gauge, Users };
