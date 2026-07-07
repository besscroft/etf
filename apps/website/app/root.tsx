import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "sonner";

import type { Route } from "./+types/root";
import "./app.css";
import { MenuProvider, mainMenu } from "~/components/app-header";
import { buildSiteJsonLdObject, SITE_URL, THEME_COLOR } from "~/lib/seo";
import { GA_MEASUREMENT_ID, isGAEnabled } from "~/lib/ga";

// 全局 head 资源：图标、字体预连接、canonical 默认值
export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
  { rel: "apple-touch-icon", href: "/favicon.ico" },
  { rel: "canonical", href: SITE_URL },
  // GA 域名预连接：让 gtag.js 首字节时间更短
  { rel: "preconnect", href: "https://www.googletagmanager.com" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  // 站点级 JSON-LD：每个页面都会渲染一次（root 层），路由 meta() 不再重复输出 WebSite
  const siteJsonLd = buildSiteJsonLdObject();

  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={THEME_COLOR} />
        <meta name="format-detection" content="telephone=no" />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(() => {
try {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", stored ? stored === "dark" : prefersDark);
} catch {}
})();`,
          }}
        />
        <Meta />
        <Links />
        {/* 站点级 WebSite + SearchAction 结构化数据（全局只此一份） */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {/* Google Analytics (gtag.js) — 全站访问统计与广告效果归因 */}
        {isGAEnabled() && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
            />
            <script
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
              }}
            />
          </>
        )}
      </head>
      <body>
        <MenuProvider config={mainMenu}>{children}</MenuProvider>
        {/* 全局 Sonner Toaster：所有 toast.error / toast.success / toast() 都在这里渲染。
            position=top-center 是中文站常见选择（顶部更醒目）；richColors 让 success/error/warning 自动着色。 */}
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // 路由转场动画交由原生 View Transitions API 处理：
  // - 各路由通过 AppLink（viewTransition prop）触发 document.startViewTransition()
  // - 动画样式定义在 app.css 的 ::view-transition-old/new(root) 规则中
  // - 相比 Motion 的 AnimatePresence 方案，原生 API 性能更优、与浏览器渲染管线更贴合
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "页面暂时不可用";
  let details = "请稍后重试，或返回首页继续查看市场数据。";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "页面暂时不可用";
    details = error.status === 404 ? "没有找到这个页面。" : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
