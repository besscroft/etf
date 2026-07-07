import * as React from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "theme";
const DARK_THEME_COLOR = "#0a0a0a";
const LIGHT_THEME_COLOR = "#f7f6f2";
const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyDocumentTheme(mode: ThemeMode, resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.theme = mode;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.content = resolvedTheme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  }

  window.dispatchEvent(
    new CustomEvent("themechange", {
      detail: { mode, resolvedTheme },
    }),
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>(readStoredMode);
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme: ResolvedTheme = mode === "system" ? systemTheme : mode;

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(media.matches ? "dark" : "light");

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  React.useEffect(() => {
    try {
      if (mode === "system") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
    applyDocumentTheme(mode, resolvedTheme);
  }, [mode, resolvedTheme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode: setModeState,
    }),
    [mode, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
