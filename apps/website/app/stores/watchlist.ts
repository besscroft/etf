import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { detectDomesticSecurity } from "~/lib/stock-data";

const STORAGE_KEY = "etf.watchlist-a-share";
const CODE_RE = /^\d{6}$/;

export interface WatchlistStock {
  code: string;
  name: string;
  createdAt: number;
}

interface WatchlistState {
  stocks: WatchlistStock[];
  hasHydrated: boolean;
  add: (code: string, name?: string) => boolean;
  remove: (code: string) => void;
  toggle: (code: string, name?: string) => boolean;
  has: (code: string) => boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function isValidCode(value: string) {
  return CODE_RE.test(value) && detectDomesticSecurity(value)?.kind === "stock";
}

function normalizeName(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 60) || "";
}

function normalizeStored(value: unknown): WatchlistStock[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: WatchlistStock[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<WatchlistStock>;
    const code = normalizeCode(String(raw.code ?? ""));
    if (!isValidCode(code) || seen.has(code)) continue;
    seen.add(code);
    result.push({
      code,
      name: normalizeName(raw.name) || code,
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    });
  }
  return result;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      stocks: [],
      hasHydrated: false,
      add: (code, name) => {
        const normalized = normalizeCode(code);
        if (!isValidCode(normalized)) return false;
        const now = Date.now();
        set((state) => ({
          stocks: [
            { code: normalized, name: normalizeName(name) || normalized, createdAt: now },
            ...state.stocks.filter((item) => item.code !== normalized),
          ],
        }));
        return true;
      },
      remove: (code) => {
        const normalized = normalizeCode(code);
        set((state) => ({ stocks: state.stocks.filter((item) => item.code !== normalized) }));
      },
      toggle: (code, name) => {
        const normalized = normalizeCode(code);
        if (!isValidCode(normalized)) return false;
        if (get().stocks.some((item) => item.code === normalized)) {
          get().remove(normalized);
          return false;
        }
        get().add(normalized, name);
        return true;
      },
      has: (code) => {
        const normalized = normalizeCode(code);
        return get().stocks.some((item) => item.code === normalized);
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ stocks: state.stocks }),
      merge: (persisted, current) => {
        const persistedStocks =
          persisted && typeof persisted === "object" && "stocks" in persisted
            ? (persisted as { stocks?: unknown }).stocks
            : [];
        return { ...current, stocks: normalizeStored(persistedStocks) };
      },
    },
  ),
);

export function useWatchlistHydration() {
  const hasHydrated = useWatchlistStore((state) => state.hasHydrated);
  useEffect(() => {
    if (hasHydrated) return;
    void Promise.resolve(useWatchlistStore.persist.rehydrate()).finally(() =>
      useWatchlistStore.getState().setHasHydrated(true),
    );
  }, [hasHydrated]);
  return hasHydrated;
}

/** 客户端订阅式判断（用于按钮高亮，避免 hydration 闪烁） */
export function useWatchlistContains(code: string): boolean {
  return useWatchlistStore((state) => state.stocks.some((item) => item.code === code));
}
