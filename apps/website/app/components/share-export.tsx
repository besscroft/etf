/**
 * 图片导出分享组件（统一入口）
 *
 * 新版采用模板化导出：根据 module 选择对应专用模板，
 * 渲染到隐藏画布后用 html-to-image 截图，确保导出图片
 * 具备模块专属的布局、色彩与内容组织。
 *
 * 用法示例：
 * <ShareExport
 *   module="nasdaq"
 *   data={{ moduleTitle, fetchedAt, funds }}
 *   fileName="nasdaq100-funds"
 * />
 */
import { useCallback, useState, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share2, X, Loader2 } from "lucide-react";
import { DURATION, EASING } from "~/lib/motion";
import { getModuleTheme } from "./share-export/module-theme";
import { useCardRenderer } from "./share-export/use-card-renderer";
import type {
  ModuleKey,
  FundListExportData,
  QDIIFundListExportData,
  ValuationExportData,
  FundDetailExportData,
  FundCompareExportData,
  StableExportData,
  AnalysisExportData,
} from "./share-export/types";
import { FundListTemplate } from "./share-export/templates/fund-list-template";
import { FundDetailTemplate } from "./share-export/templates/fund-detail-template";
import { FundCompareTemplate } from "./share-export/templates/fund-compare-template";
import { ValuationTemplate } from "./share-export/templates/valuation-template";
import { StableTemplate } from "./share-export/templates/stable-template";
import { AnalysisTemplate } from "./share-export/templates/analysis-template";

/** 按模块选择对应模板的入参类型 */
export interface ShareExportProps {
  /** 模块标识（决定使用哪个专用模板） */
  module: ModuleKey;
  /** 模块对应的导出数据 */
  data:
    | FundListExportData
    | QDIIFundListExportData
    | ValuationExportData
    | FundDetailExportData
    | FundCompareExportData
    | StableExportData
    | AnalysisExportData;
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
  /** 是否禁用（如数据未就绪） */
  disabled?: boolean;
}

export function ShareExport({
  module,
  data,
  fileName = "etfvoid-export",
  label = "导出图片",
  size = "sm",
  variant = "outline",
  className,
  disabled,
}: ShareExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isGenerating, renderToImage } = useCardRenderer();

  /** 根据模块构造对应的卡片 React 节点 */
  const buildCard = useCallback((): ReactNode => {
    const theme = getModuleTheme(module);
    const generatedAt = new Date().toISOString();

    switch (module) {
      case "nasdaq":
      case "sp500":
      case "active": {
        const d = data as FundListExportData;
        return (
          <FundListTemplate
            theme={theme}
            moduleTitle={d.moduleTitle}
            fetchedAt={d.fetchedAt}
            generatedAt={generatedAt}
            funds={d.funds}
            filterLabel={d.filterLabel}
          />
        );
      }
      case "qdii": {
        const d = data as QDIIFundListExportData;
        return (
          <FundListTemplate
            theme={theme}
            moduleTitle={d.moduleTitle}
            fetchedAt={d.fetchedAt}
            generatedAt={generatedAt}
            funds={d.funds}
            filterLabel={d.filterLabel}
            showCategory
          />
        );
      }
      case "valuation": {
        const d = data as ValuationExportData;
        return (
          <ValuationTemplate
            theme={theme}
            funds={d.funds}
            session={d.session}
            fetchedAt={d.fetchedAt}
            generatedAt={generatedAt}
          />
        );
      }
      case "fund-detail": {
        const d = data as FundDetailExportData;
        return <FundDetailTemplate theme={theme} fund={d.fund} generatedAt={generatedAt} />;
      }
      case "fund-compare": {
        const d = data as FundCompareExportData;
        return <FundCompareTemplate theme={theme} funds={d.funds} generatedAt={generatedAt} />;
      }
      case "stable": {
        const d = data as StableExportData;
        return <StableTemplate theme={theme} products={d.products} generatedAt={generatedAt} />;
      }
      case "analysis": {
        const d = data as AnalysisExportData;
        return <AnalysisTemplate theme={theme} fund={d.fund} generatedAt={generatedAt} />;
      }
      default: {
        // 穷尽性检查：编译期保证所有 module 都有对应分支
        const _exhaustive: never = module;
        void _exhaustive;
        return null;
      }
    }
  }, [module, data]);

  /** 生成图片 */
  const generateImage = useCallback(async () => {
    if (disabled) return;
    setError(null);
    try {
      const node = buildCard();
      const dataUrl = await renderToImage(node);
      setImageUrl(dataUrl);
      setIsOpen(true);
    } catch {
      setError("图片生成失败，请重试");
    }
  }, [buildCard, renderToImage, disabled]);

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
    setTimeout(() => setImageUrl(null), 300);
  }, []);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={generateImage}
        disabled={isGenerating || disabled}
        data-exclude-from-export="true"
      >
        {isGenerating ? (
          <Loader2 className="mr-1 size-3.5 animate-spin" />
        ) : (
          <Share2 className="mr-1 size-3.5" />
        )}
        {label}
      </Button>

      {error && (
        <p className="mt-1 text-xs text-destructive" data-exclude-from-export="true">
          {error}
        </p>
      )}

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
