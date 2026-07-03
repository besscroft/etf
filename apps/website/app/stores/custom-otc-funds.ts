import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OTCCategory } from "~/lib/market-data";

const FUND_CODE_RE = /^\d{6}$/;
const STORAGE_KEY = "etf.custom-otc-funds";
const FALLBACK_CATEGORY: OTCCategory = "qdii";
const VALID_CATEGORIES = new Set<OTCCategory>(["stock", "hybrid", "index", "bond", "qdii", "fof"]);

export interface CustomOTCFund {
  code: string;
  name: string;
  category: OTCCategory;
  createdAt: number;
  updatedAt: number;
}

interface CustomOTCFundDraft {
  code: string;
  name?: string;
  category: OTCCategory;
}

interface CustomOTCFundsState {
  funds: CustomOTCFund[];
  hasHydrated: boolean;
  addFund: (fund: CustomOTCFundDraft) => CustomOTCFund | null;
  removeFund: (code: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export function normalizeFundCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isValidFundCode(value: string) {
  return FUND_CODE_RE.test(value);
}

function normalizeFundName(code: string, value?: string) {
  const name = (value ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  return name || `自选基金 ${code}`;
}

function normalizeCategory(value: unknown): OTCCategory {
  return VALID_CATEGORIES.has(value as OTCCategory) ? (value as OTCCategory) : FALLBACK_CATEGORY;
}

function normalizeStoredFunds(value: unknown): CustomOTCFund[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const funds: CustomOTCFund[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<CustomOTCFund>;
    const code = normalizeFundCode(String(raw.code ?? ""));
    if (!isValidFundCode(code) || seen.has(code)) continue;
    seen.add(code);

    funds.push({
      code,
      name: normalizeFundName(code, raw.name),
      category: normalizeCategory(raw.category),
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    });
  }

  return funds;
}

export const useCustomOTCFundsStore = create<CustomOTCFundsState>()(
  persist(
    (set, get) => ({
      funds: [],
      hasHydrated: false,
      addFund: (draft) => {
        const code = normalizeFundCode(draft.code);
        if (!isValidFundCode(code)) return null;

        const now = Date.now();
        const existing = get().funds.find((fund) => fund.code === code);
        const fund: CustomOTCFund = {
          code,
          name: normalizeFundName(code, draft.name),
          category: normalizeCategory(draft.category),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        set((state) => ({
          funds: [fund, ...state.funds.filter((item) => item.code !== code)],
        }));

        return fund;
      },
      removeFund: (code) => {
        const normalizedCode = normalizeFundCode(code);
        set((state) => ({
          funds: state.funds.filter((fund) => fund.code !== normalizedCode),
        }));
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ funds: state.funds }),
      merge: (persisted, current) => {
        const persistedFunds =
          persisted && typeof persisted === "object" && "funds" in persisted
            ? (persisted as { funds?: unknown }).funds
            : [];

        return {
          ...current,
          funds: normalizeStoredFunds(persistedFunds),
        };
      },
    },
  ),
);

export function useCustomOTCFundsHydration() {
  const hasHydrated = useCustomOTCFundsStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated) return;

    void Promise.resolve(useCustomOTCFundsStore.persist.rehydrate()).finally(() =>
      useCustomOTCFundsStore.getState().setHasHydrated(true),
    );
  }, [hasHydrated]);

  return hasHydrated;
}
