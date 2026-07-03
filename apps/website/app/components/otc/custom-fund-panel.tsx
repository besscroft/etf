import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Database, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  OTC_CATEGORY_LABELS,
  OTC_CATEGORY_ORDER,
  type OTCCategory,
} from "~/lib/market-data";
import {
  isValidFundCode,
  normalizeFundCode,
  useCustomOTCFundsHydration,
  useCustomOTCFundsStore,
} from "~/stores/custom-otc-funds";

interface CustomFundPanelProps {
  activeCategory: OTCCategory | "all";
  selectedCodes: string[];
  reachedLimit: boolean;
  onAdd: (code: string) => void;
}

export function CustomFundPanel({
  activeCategory,
  selectedCodes,
  reachedLimit,
  onAdd,
}: CustomFundPanelProps) {
  const hasHydrated = useCustomOTCFundsHydration();
  const customFunds = useCustomOTCFundsStore((state) => state.funds);
  const addCustomFund = useCustomOTCFundsStore((state) => state.addFund);
  const removeCustomFund = useCustomOTCFundsStore((state) => state.removeFund);
  const defaultCategory = activeCategory === "all" ? "qdii" : activeCategory;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<OTCCategory>(defaultCategory);
  const [error, setError] = useState("");

  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  const visibleCustomFunds = useMemo(() => {
    if (activeCategory === "all") return customFunds;
    return customFunds.filter((fund) => fund.category === activeCategory);
  }, [activeCategory, customFunds]);

  const selectedCodeSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const saveFund = () => {
    const normalizedCode = normalizeFundCode(code);
    if (!isValidFundCode(normalizedCode)) {
      setError("请输入 6 位基金代码");
      return null;
    }

    const fund = addCustomFund({ code: normalizedCode, name, category });
    if (!fund) {
      setError("基金代码格式不正确");
      return null;
    }

    setCode("");
    setName("");
    setError("");
    return fund;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveFund();
  };

  const handleSaveAndAdd = () => {
    const fund = saveFund();
    if (fund) onAdd(fund.code);
  };

  return (
    <Card size="sm" className="mb-6">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          自选基金
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[9rem_1fr_8rem_auto]">
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            基金代码
            <input
              value={code}
              onChange={(event) => {
                setCode(normalizeFundCode(event.target.value));
                setError("");
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="例如 006327"
              className="h-9 rounded-md border bg-background px-3 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            名称
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder="可选，留空则用代码命名"
              className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">
            分类
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as OTCCategory)}
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {OTC_CATEGORY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {OTC_CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="outline" size="lg" className="h-9">
              <Save className="size-4" />
              保存
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-9"
              onClick={handleSaveAndAdd}
              disabled={reachedLimit}
            >
              <Plus className="size-4" />
              加入
            </Button>
          </div>
        </form>

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        {reachedLimit && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            对比数量已达上限，请先移除部分基金再加入。
          </p>
        )}

        <div className="mt-4 border-t pt-3">
          {!hasHydrated ? (
            <p className="text-sm text-muted-foreground">正在读取浏览器自选...</p>
          ) : visibleCustomFunds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              还没有{activeCategory === "all" ? "" : OTC_CATEGORY_LABELS[activeCategory]}自选基金。
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleCustomFunds.map((fund) => {
                const selected = selectedCodeSet.has(fund.code);
                return (
                  <div
                    key={fund.code}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{fund.code}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {OTC_CATEGORY_LABELS[fund.category]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium">{fund.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onAdd(fund.code)}
                        disabled={selected || reachedLimit}
                        aria-label={selected ? "已加入对比" : "加入对比"}
                      >
                        <Plus className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeCustomFund(fund.code)}
                        aria-label="删除自选基金"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
