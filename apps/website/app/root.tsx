import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { MenuProvider, mainMenu } from "~/components/app-header";
import { buildSiteJsonLdObject, SITE_URL, THEME_COLOR } from "~/lib/seo";

// 全局 head 资源：图标、字体预连接、canonical 默认值
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "icon", href: "/favicon.ico" },
  { rel: "apple-touch-icon", href: "/favicon.ico" },
  { rel: "canonical", href: SITE_URL },
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
        <Meta />
        <Links />
        {/* 站点级 WebSite + SearchAction 结构化数据（全局只此一份） */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body>
        <MenuProvider config={mainMenu}>{children}</MenuProvider>
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
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
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
