/**
 * 图片导出分享组件
 * 支持将指定 DOM 区域导出为图片，带预览弹窗和下载功能
 */
import { useState, useCallback, useRef, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Button } from "~/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share2, X, Loader2 } from "lucide-react";
import { DURATION, EASING } from "~/lib/motion";

interface ShareExportProps {
  /** 要导出的 DOM 元素 ref */
  targetRef: RefObject<HTMLElement | null>;
  /** 导出文件名（不含扩展名） */
  fileName?: string;
  /** 按钮文字 */
  label?: string;
  /** 按钮大小 */
  size?: "default" | "sm" | "lg" | "icon";
  /** 按钮变体 */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** 自定义类名 */
  className?: string;
}

export function ShareExport({
  targetRef,
  fileName = "etfvoid-export",
  label = "导出图片",
  size = "sm",
  variant = "outline",
  className,
}: ShareExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  /** 生成图片 */
  const generateImage = useCallback(async () => {
    if (!targetRef.current) return;
    abortRef.current = false;
    setIsGenerating(true);
    setError(null);

    try {
      // 给浏览器一帧时间渲染
      await new Promise((r) => requestAnimationFrame(r));

      const dataUrl = await toPng(targetRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        // 过滤掉不需要导出的元素（如导出按钮自身）
        filter: (node: HTMLElement) => {
          if (node.dataset?.excludeFromExport === "true") return false;
          return true;
        },
      });

      if (!abortRef.current) {
        setImageUrl(dataUrl);
        setIsOpen(true);
      }
    } catch (err) {
      if (!abortRef.current) {
        setError("图片生成失败，请重试");
        console.error("导出图片失败:", err);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [targetRef]);

  /** 下载图片 */
  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = imageUrl;
    link.click();
  }, [imageUrl, fileName]);

  /** 关闭弹窗 */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    // 延迟清理 URL，避免闪烁
    setTimeout(() => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      setImageUrl(null);
    }, 300);
  }, [imageUrl]);

  return (
    <>
      {/* 导出按钮 */}
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={generateImage}
        disabled={isGenerating}
        data-exclude-from-export="true"
      >
        {isGenerating ? (
          <Loader2 className="mr-1 size-3.5 animate-spin" />
        ) : (
          <Share2 className="mr-1 size-3.5" />
        )}
        {label}
      </Button>

      {/* 错误提示 */}
      {error && (
        <p className="mt-1 text-xs text-destructive" data-exclude-from-export="true">
          {error}
        </p>
      )}

      {/* 预览弹窗 */}
      <AnimatePresence>
        {isOpen && imageUrl && (
          <motion.div
            key="share-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: DURATION.normal, ease: EASING.easeOut }}
              className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-background shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-medium">图片预览</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleDownload}>
                    <Download className="mr-1 size-3.5" />
                    下载图片
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleClose} aria-label="关闭">
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              {/* 图片预览区 */}
              <div className="overflow-auto p-4" style={{ maxHeight: "calc(90vh - 60px)" }}>
                <img
                  src={imageUrl}
                  alt="导出预览"
                  className="mx-auto max-w-full rounded border shadow-sm"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
