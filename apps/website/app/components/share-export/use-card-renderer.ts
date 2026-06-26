/**
 * useCardRenderer
 *
 * 将给定的 React 节点渲染到脱离视口的隐藏容器，
 * 再用 html-to-image 截图，返回 dataURL。
 *
 * 设计要点：
 * - 隐藏容器使用 absolute + opacity:0 定位（避免 fixed + 负偏移，
 *   html-to-image 用 SVG foreignObject 截图，fixed 节点会相对其
 *   viewport 跑出可视区域导致白图）
 * - flushSync 强制同步提交，避免 concurrent 模式下 rAF 等待不可靠
 * - 截图前断言 holder 已渲染出子节点，防止白图
 * - pixelRatio=3 保证清晰度
 * - 截图完成后立即清理 DOM，避免内存泄漏
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import { CARD_WIDTH } from "./share-card-canvas";

interface UseCardRendererResult {
  /** 当前是否正在生成图片 */
  isGenerating: boolean;
  /** 错误信息 */
  error: string | null;
  /** 渲染指定节点并截图 */
  renderToImage: (node: ReactNode) => Promise<string>;
}

export function useCardRenderer(): UseCardRendererResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 持有隐藏容器的 root 句柄，便于卸载
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);

  /** 创建/复用隐藏容器 */
  const ensureHolder = useCallback(() => {
    if (holderRef.current && rootRef.current) return holderRef.current;

    const holder = document.createElement("div");
    // absolute + opacity:0 + z-index:-9999：保持在视口内可被截图，
    // 但视觉上不可见且不响应交互
    holder.style.position = "absolute";
    holder.style.top = "0";
    holder.style.left = "0";
    holder.style.width = `${CARD_WIDTH}px`;
    holder.style.opacity = "0";
    holder.style.pointerEvents = "none";
    holder.style.zIndex = "-9999";
    holder.style.background = "#ffffff";
    document.body.appendChild(holder);
    holderRef.current = holder;
    rootRef.current = createRoot(holder);
    return holder;
  }, []);

  /** 清理隐藏容器 */
  const cleanup = useCallback(() => {
    if (rootRef.current) {
      rootRef.current.unmount();
      rootRef.current = null;
    }
    if (holderRef.current) {
      holderRef.current.remove();
      holderRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const renderToImage = useCallback(
    async (node: ReactNode): Promise<string> => {
      setIsGenerating(true);
      setError(null);
      try {
        const holder = ensureHolder();

        // flushSync 强制同步提交，确保 DOM 在下一行代码执行前已 commit
        if (!rootRef.current) {
          throw new Error("root 不可用");
        }
        flushSync(() => {
          rootRef.current!.render(node);
        });

        // 字体加载（Noto Serif Variable 可能在首次渲染时未就绪）
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        // 给字体应用再留一帧
        await new Promise((r) => requestAnimationFrame(r));

        // 截图前断言 holder 已渲染出内容，避免白图
        if (!holder.hasChildNodes() || holder.innerHTML.length < 50) {
          throw new Error(
            `隐藏容器内未渲染出有效内容（innerHTML 长度=${holder.innerHTML.length}）`,
          );
        }

        const dataUrl = await toPng(holder, {
          quality: 0.95,
          pixelRatio: 3,
          backgroundColor: "#ffffff",
          // 克隆节点后重置透明度（holder 自身 opacity:0 用于视觉隐藏）
          style: { opacity: "1" },
          // 跳过自身带 data-exclude-from-export 的元素
          filter: (node: HTMLElement) => {
            if (node.dataset?.excludeFromExport === "true") return false;
            return true;
          },
        });

        return dataUrl;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        setError(`图片生成失败：${msg}`);
        throw err;
      } finally {
        // 完成后清理隐藏 DOM
        cleanup();
        setIsGenerating(false);
      }
    },
    [ensureHolder, cleanup],
  );

  return { isGenerating, error, renderToImage };
}
