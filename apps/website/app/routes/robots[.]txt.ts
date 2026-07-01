import type { Route } from "./+types/robots[.]txt";
import { SITE_URL } from "~/lib/seo";

/**
 * 资源路由：返回 robots.txt
 * 允许全部爬虫抓取，单独禁掉 /api/ 避免爬到内部接口
 */
export async function loader(_args: Route.LoaderArgs) {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
