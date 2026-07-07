import * as React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useTheme, type ThemeMode } from "./theme-provider";

const THEME_OPTIONS: Array<{
  icon: typeof Monitor;
  key: ThemeMode;
  label: string;
}> = [
  { key: "system", label: "跟随系统", icon: Monitor },
  { key: "light", label: "浅色", icon: Sun },
  { key: "dark", label: "深色", icon: Moon },
];

export function ThemeMenu() {
  const { mode, resolvedTheme, setMode } = useTheme();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const CurrentIcon = mode === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="主题设置"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <CurrentIcon className="size-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {THEME_OPTIONS.map((item) => {
            const Icon = item.icon;
            const active = mode === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-xs transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  active && "bg-muted text-foreground",
                )}
                onClick={() => {
                  setMode(item.key);
                  setOpen(false);
                }}
              >
                <Icon className="size-3.5 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                {active ? <Check className="size-3.5 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
