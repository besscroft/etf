/**
 * 自选股切换按钮（2026-07-15 新增）
 *
 * 客户端组件：读取 zustand watchlist store，点击在「已自选 / 未自选」间切换。
 * SSR 时不渲染真实状态（避免 hydration 不匹配），等 hydrate 后展示。
 */

import * as React from "react";
import { Star } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useWatchlistContains, useWatchlistHydration, useWatchlistStore } from "~/stores/watchlist";

interface WatchlistButtonProps {
  code: string;
  name?: string;
  /** 展示为图标按钮还是带文字按钮 */
  variant?: "icon" | "full";
}

export function WatchlistButton({ code, name, variant = "icon" }: WatchlistButtonProps) {
  const hydrated = useWatchlistHydration();
  const contains = useWatchlistContains(code);
  const toggle = useWatchlistStore((state) => state.toggle);

  const active = hydrated && contains;

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(code, name);
  };

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant={active ? "secondary" : "default"}
        size="sm"
        onClick={onClick}
        data-icon="inline-start"
      >
        <Star className={active ? "fill-current" : ""} />
        {active ? "已自选" : "加自选"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={active ? "取消自选" : "加自选"}
      aria-pressed={active}
      onClick={onClick}
    >
      <Star className={active ? "fill-current text-primary" : ""} />
    </Button>
  );
}
