import { AppLink as Link } from "~/components/ui/link";
import { useState, useMemo } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/motion";
import { motion, AnimatePresence } from "motion/react";
import { buildMeta } from "~/lib/seo";
import {
  ArrowLeft,
  Shield,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { DURATION, EASING } from "~/lib/motion";
import { ShareExport } from "~/components/share-export";
import { AppHeader } from "~/components/app-header";

export function meta() {
  return buildMeta({
    title: "稳健收益",
    description:
      "中美稳定理财对比：国债、企业债、REITs等低波动资产，信用评级、最大回撤与入场方式一览",
    path: "/global/stable",
  });
}

// ==================== 稳健收益产品数据 ====================

interface StableProduct {
  /** 市场：国内/美国/全球 */
  market: string;
  /** 类型 */
  type: string;
  /** 产品名称 */
  name: string;
  /** 年化收益率(%) */
  annualYield: number;
  /** 最大回撤(%, 正数) */
  maxDrawdown: number;
  /** 成立年限 */
  years: number;
  /** 信用评级 */
  rating: string;
  /** 入场方式 */
  entry: string;
  /** 市场 tag 颜色 */
  marketTag: "cn" | "us" | "global";
}

/** 稳健收益产品数据集 */
const STABLE_PRODUCTS: StableProduct[] = [
  // 国内 - 银行存款
  {
    market: "国内",
    type: "银行存款",
    name: "国有大行3年定期",
    annualYield: 1.95,
    maxDrawdown: 0,
    years: 30,
    rating: "AAA",
    entry: "银行柜台/APP",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "银行存款",
    name: "大额存单(20万起)",
    annualYield: 2.1,
    maxDrawdown: 0,
    years: 30,
    rating: "AAA",
    entry: "银行柜台/APP",
    marketTag: "cn",
  },
  // 国内 - 货币基金
  {
    market: "国内",
    type: "货币基金",
    name: "余额宝(天弘)",
    annualYield: 1.45,
    maxDrawdown: 0.01,
    years: 12,
    rating: "—",
    entry: "支付宝/基金APP",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "货币基金",
    name: "微信零钱通",
    annualYield: 1.5,
    maxDrawdown: 0.01,
    years: 8,
    rating: "—",
    entry: "微信/基金APP",
    marketTag: "cn",
  },
  // 国内 - 国债
  {
    market: "国内",
    type: "国债",
    name: "3年期储蓄国债",
    annualYield: 2.0,
    maxDrawdown: 0,
    years: 30,
    rating: "AAA(主权)",
    entry: "银行柜台(抢购)",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "国债",
    name: "10年期国债ETF(511260)",
    annualYield: 2.8,
    maxDrawdown: 3.5,
    years: 10,
    rating: "AAA(主权)",
    entry: "证券账户",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "国债",
    name: "30年期国债ETF(511090)",
    annualYield: 3.5,
    maxDrawdown: 8.2,
    years: 5,
    rating: "AAA(主权)",
    entry: "证券账户",
    marketTag: "cn",
  },
  // 国内 - 企业债
  {
    market: "国内",
    type: "企业债",
    name: "3-5年AAA企业债",
    annualYield: 3.0,
    maxDrawdown: 2.5,
    years: 15,
    rating: "AAA",
    entry: "证券账户/基金",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "企业债",
    name: "短融ETF(511360)",
    annualYield: 2.2,
    maxDrawdown: 0.3,
    years: 8,
    rating: "AA+",
    entry: "证券账户",
    marketTag: "cn",
  },
  // 国内 - REITs
  {
    market: "国内",
    type: "REITs",
    name: "中金普洛斯REIT",
    annualYield: 4.2,
    maxDrawdown: 15.0,
    years: 4,
    rating: "—",
    entry: "证券账户",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "REITs",
    name: "华安张江REIT",
    annualYield: 3.8,
    maxDrawdown: 12.0,
    years: 3,
    rating: "—",
    entry: "证券账户",
    marketTag: "cn",
  },
  // 美国 - 国债
  {
    market: "美国",
    type: "国债",
    name: "短期国债(T-Bill <1年)",
    annualYield: 4.8,
    maxDrawdown: 0.2,
    years: 50,
    rating: "AAA(主权)",
    entry: "券商/基金(QDII)",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "国债",
    name: "中期国债(2-10年)",
    annualYield: 4.3,
    maxDrawdown: 5.0,
    years: 50,
    rating: "AAA(主权)",
    entry: "券商/基金(QDII)",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "国债",
    name: "长期国债(10年+)",
    annualYield: 4.5,
    maxDrawdown: 15.0,
    years: 50,
    rating: "AAA(主权)",
    entry: "券商/基金(QDII)",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "国债ETF",
    name: "SHV(超短期国债ETF)",
    annualYield: 4.7,
    maxDrawdown: 0.5,
    years: 18,
    rating: "AAA(主权)",
    entry: "美股账户",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "国债ETF",
    name: "IEF(7-10年国债ETF)",
    annualYield: 4.2,
    maxDrawdown: 10.0,
    years: 22,
    rating: "AAA(主权)",
    entry: "美股账户",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "国债ETF",
    name: "TLT(20年+国债ETF)",
    annualYield: 4.5,
    maxDrawdown: 25.0,
    years: 23,
    rating: "AAA(主权)",
    entry: "美股账户",
    marketTag: "us",
  },
  // 美国 - 企业债
  {
    market: "美国",
    type: "企业债ETF",
    name: "LQD(投资级公司债)",
    annualYield: 5.2,
    maxDrawdown: 12.0,
    years: 23,
    rating: "BBB+/A-",
    entry: "美股账户",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "企业债ETF",
    name: "AGG(全美综合债券)",
    annualYield: 4.5,
    maxDrawdown: 8.0,
    years: 21,
    rating: "投资级",
    entry: "美股账户",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "企业债ETF",
    name: "VCIT(中期公司债)",
    annualYield: 5.0,
    maxDrawdown: 10.0,
    years: 18,
    rating: "投资级",
    entry: "美股账户",
    marketTag: "us",
  },
  // 美国 - REITs
  {
    market: "美国",
    type: "REITs",
    name: "VNQ(全美REITs ETF)",
    annualYield: 3.8,
    maxDrawdown: 35.0,
    years: 20,
    rating: "—",
    entry: "美股账户",
    marketTag: "us",
  },
  {
    market: "美国",
    type: "REITs",
    name: "SCHH(美国REITs ETF)",
    annualYield: 3.5,
    maxDrawdown: 33.0,
    years: 14,
    rating: "—",
    entry: "美股账户",
    marketTag: "us",
  },
  // 全球 - 新兴市场债
  {
    market: "全球",
    type: "新兴市场债",
    name: "EMB(新兴市场债券ETF)",
    annualYield: 6.5,
    maxDrawdown: 18.0,
    years: 17,
    rating: "BB/B",
    entry: "美股账户",
    marketTag: "global",
  },
  {
    market: "全球",
    type: "新兴市场债",
    name: "PCY(新兴市场主权债)",
    annualYield: 6.0,
    maxDrawdown: 15.0,
    years: 17,
    rating: "BBB-/BB+",
    entry: "美股账户",
    marketTag: "global",
  },
  // 全球 - 国际债券
  {
    market: "全球",
    type: "国际债券",
    name: "BNDX(国际综合债券ETF)",
    annualYield: 3.8,
    maxDrawdown: 10.0,
    years: 13,
    rating: "投资级",
    entry: "美股账户",
    marketTag: "global",
  },
  {
    market: "全球",
    type: "国际债券",
    name: "IAGG(国际核心债券ETF)",
    annualYield: 3.5,
    maxDrawdown: 9.0,
    years: 8,
    rating: "投资级",
    entry: "美股账户",
    marketTag: "global",
  },
  // 国内 - 债券基金
  {
    market: "国内",
    type: "债券基金",
    name: "易方达中短债A",
    annualYield: 3.0,
    maxDrawdown: 1.2,
    years: 8,
    rating: "—",
    entry: "基金APP/证券",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "债券基金",
    name: "招商产业债券A",
    annualYield: 4.0,
    maxDrawdown: 3.5,
    years: 12,
    rating: "—",
    entry: "基金APP/证券",
    marketTag: "cn",
  },
  {
    market: "国内",
    type: "债券基金",
    name: "富国信用债A",
    annualYield: 3.8,
    maxDrawdown: 2.8,
    years: 10,
    rating: "—",
    entry: "基金APP/证券",
    marketTag: "cn",
  },
];

// ==================== 排序字段 ====================

type SortField = "annualYield" | "maxDrawdown" | "years" | "name";
type SortDir = "asc" | "desc";

// ==================== 页面组件 ====================

export default function Stable() {
  // 筛选状态
  const [yieldMin, setYieldMin] = useState("");
  const [yieldMax, setYieldMax] = useState("");
  const [drawdownMin, setDrawdownMin] = useState("");
  const [drawdownMax, setDrawdownMax] = useState("");
  const [yearsMin, setYearsMin] = useState("");
  const [yearsMax, setYearsMax] = useState("");
  const [sortField, setSortField] = useState<SortField>("annualYield");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 筛选与排序
  const filtered = useMemo(() => {
    let list = [...STABLE_PRODUCTS];

    // 年化收益筛选
    const yMin = parseFloat(yieldMin);
    const yMax = parseFloat(yieldMax);
    if (!isNaN(yMin)) list = list.filter((p) => p.annualYield >= yMin);
    if (!isNaN(yMax)) list = list.filter((p) => p.annualYield <= yMax);

    // 最大回撤筛选
    const dMin = parseFloat(drawdownMin);
    const dMax = parseFloat(drawdownMax);
    if (!isNaN(dMin)) list = list.filter((p) => p.maxDrawdown >= dMin);
    if (!isNaN(dMax)) list = list.filter((p) => p.maxDrawdown <= dMax);

    // 成立年限筛选
    const yrMin = parseFloat(yearsMin);
    const yrMax = parseFloat(yearsMax);
    if (!isNaN(yrMin)) list = list.filter((p) => p.years >= yrMin);
    if (!isNaN(yrMax)) list = list.filter((p) => p.years <= yrMax);

    // 排序
    list.sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return list;
  }, [yieldMin, yieldMax, drawdownMin, drawdownMax, yearsMin, yearsMax, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "annualYield" ? "desc" : "asc");
    }
  };

  const resetFilters = () => {
    setYieldMin("");
    setYieldMax("");
    setDrawdownMin("");
    setDrawdownMax("");
    setYearsMin("");
    setYearsMax("");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentLabel="稳健收益" />
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4">
        {/* 标题区 */}
        <section className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="mb-2 text-xl font-bold tracking-tight md:text-2xl">中美稳定理财对比</h1>
            <p className="text-sm text-muted-foreground md:text-base">
              梳理中国与美股体系下的低波动资产，包含国债、企业债、REITs等，供参考对比。
              数据含信用评级、历史最大回撤与入场方式，仅作信息呈现。
            </p>
          </div>
          <ShareExport module="stable" data={{ products: filtered }} fileName="stable-products" />
        </section>

        {/* 利差提示 */}
        <SpreadCallout />

        {/* 筛选器 */}
        <FilterSection
          yieldMin={yieldMin}
          yieldMax={yieldMax}
          drawdownMin={drawdownMin}
          drawdownMax={drawdownMax}
          yearsMin={yearsMin}
          yearsMax={yearsMax}
          onYieldMinChange={setYieldMin}
          onYieldMaxChange={setYieldMax}
          onDrawdownMinChange={setDrawdownMin}
          onDrawdownMaxChange={setDrawdownMax}
          onYearsMinChange={setYearsMin}
          onYearsMaxChange={setYearsMax}
          onReset={resetFilters}
          resultCount={filtered.length}
        />

        {/* 产品表格 */}
        <ProductTable
          products={filtered}
          sortField={sortField}
          sortDir={sortDir}
          onSort={toggleSort}
        />

        {/* 免责声明 */}
        <Disclaimer />
      </main>
    </div>
  );
}

// ==================== 利差提示卡 ====================

function SpreadCallout() {
  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="flex gap-3 py-4">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-500" />
        <div>
          <p className="mb-1 text-sm font-medium">值得关注的利差现象</p>
          <p className="text-xs text-muted-foreground md:text-sm">
            当前美国短期国债年化约
            4.8%，高于国内银行存款利率（约1.45%）。但境外资产存在汇率风险、开户门槛和税务差异，综合收益因人而异，请结合自身情况判断。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 筛选器 ====================

function FilterSection({
  yieldMin,
  yieldMax,
  drawdownMin,
  drawdownMax,
  yearsMin,
  yearsMax,
  onYieldMinChange,
  onYieldMaxChange,
  onDrawdownMinChange,
  onDrawdownMaxChange,
  onYearsMinChange,
  onYearsMaxChange,
  onReset,
  resultCount,
}: {
  yieldMin: string;
  yieldMax: string;
  drawdownMin: string;
  drawdownMax: string;
  yearsMin: string;
  yearsMax: string;
  onYieldMinChange: (v: string) => void;
  onYieldMaxChange: (v: string) => void;
  onDrawdownMinChange: (v: string) => void;
  onDrawdownMaxChange: (v: string) => void;
  onYearsMinChange: (v: string) => void;
  onYearsMaxChange: (v: string) => void;
  onReset: () => void;
  resultCount: number;
}) {
  const hasFilter = yieldMin || yieldMax || drawdownMin || drawdownMax || yearsMin || yearsMax;

  return (
    <section className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-muted-foreground" />
          筛选
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{resultCount} 个产品</span>
          {hasFilter && (
            <Button variant="ghost" size="xs" onClick={onReset}>
              重置
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        <FilterRangeInput
          label="年化收益 (%)"
          min={yieldMin}
          max={yieldMax}
          onMinChange={onYieldMinChange}
          onMaxChange={onYieldMaxChange}
          placeholderMin="例: 3"
          placeholderMax="例: 7"
        />
        <FilterRangeInput
          label="最大回撤 (%, 填正数)"
          min={drawdownMin}
          max={drawdownMax}
          onMinChange={onDrawdownMinChange}
          onMaxChange={onDrawdownMaxChange}
          placeholderMin="例: 0"
          placeholderMax="例: 15"
        />
        <FilterRangeInput
          label="成立年限（年）"
          min={yearsMin}
          max={yearsMax}
          onMinChange={onYearsMinChange}
          onMaxChange={onYearsMaxChange}
          placeholderMin="例: 10"
          placeholderMax="—"
        />
      </div>
    </section>
  );
}

function FilterRangeInput({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  placeholderMin,
  placeholderMax,
}: {
  label: string;
  min: string;
  max: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  placeholderMin: string;
  placeholderMax: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={min}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder={placeholderMin}
          className="w-full rounded-sm border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <input
          type="text"
          inputMode="decimal"
          value={max}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder={placeholderMax}
          className="w-full rounded-sm border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}

// ==================== 产品表格 ====================

function ProductTable({
  products,
  sortField,
  sortDir,
  onSort,
}: {
  products: StableProduct[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  if (products.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <Filter className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">没有符合条件的产品，试试放宽筛选范围</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <ThCell>市场</ThCell>
                <ThCell>类型</ThCell>
                <ThCell>产品</ThCell>
                <ThSortableCell
                  label="年化收益"
                  field="annualYield"
                  current={sortField}
                  dir={sortDir}
                  onSort={onSort}
                />
                <ThSortableCell
                  label="最大回撤"
                  field="maxDrawdown"
                  current={sortField}
                  dir={sortDir}
                  onSort={onSort}
                />
                <ThSortableCell
                  label="年限"
                  field="years"
                  current={sortField}
                  dir={sortDir}
                  onSort={onSort}
                />
                <ThCell>信用评级</ThCell>
                <ThCell>入场方式</ThCell>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <ProductRow key={`${p.name}-${idx}`} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ThCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
      {children}
    </th>
  );
}

function ThSortableCell({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

function ProductRow({ product }: { product: StableProduct }) {
  const marketColor = {
    cn: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    us: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    global: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const marketLabel = {
    cn: "国内",
    us: "美国",
    global: "全球",
  };

  return (
    <tr className="border-b last:border-0 transition-colors hover:bg-muted/30">
      <td className="px-3 py-2.5">
        <Badge variant="secondary" className={`text-xs ${marketColor[product.marketTag]}`}>
          {marketLabel[product.marketTag]}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{product.type}</td>
      <td className="px-3 py-2.5 text-xs font-medium">{product.name}</td>
      <td className="px-3 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        {product.annualYield}%
      </td>
      <td className="px-3 py-2.5 text-xs">
        <span
          className={
            product.maxDrawdown === 0
              ? "text-muted-foreground"
              : product.maxDrawdown <= 3
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-500"
          }
        >
          {product.maxDrawdown === 0 ? "≈0" : `${product.maxDrawdown}%`}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{product.years}年</td>
      <td className="px-3 py-2.5 text-xs">
        {product.rating === "—" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Badge variant="outline" className="text-xs">
            {product.rating}
          </Badge>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{product.entry}</td>
    </tr>
  );
}

// ==================== 免责声明 ====================

function Disclaimer() {
  return (
    <div className="mt-6 flex gap-2 rounded-md border bg-muted/30 px-4 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <p className="text-xs text-muted-foreground">
        所有收益率为当前参考值，随市场实时变化。最大回撤基于历史数据，不代表未来风险。汇率波动可能显著影响境外资产的实际人民币收益。本页内容仅供参考，不构成投资建议。
      </p>
    </div>
  );
}
