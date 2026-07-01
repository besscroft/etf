import * as React from "react";
import { Await } from "react-router";

/**
 * 异步数据块包装器
 *
 * 设计动机：路由 loader 用 defer() 推迟非关键数据后，组件用 <Await> 等待 Promise。
 * 散落写 <Suspense><Await/></Suspense> 模板化过重，故集中到本组件。
 *
 * 用法：
 * ```tsx
 * const { stats } = useLoaderData<typeof loader>();
 *
 * <AsyncSection resolve={stats} fallback={<StatsSkeleton />}>
 *   {(data) => <StatsView data={data} />}
 * </AsyncSection>
 * ```
 *
 * - `resolve`: loader 中 defer() 产出的 Promise（或已 resolved 的值，便于复用）
 * - `fallback`: 加载阶段显示的占位（推荐传 Skeleton）
 * - `children`: render-prop 形式，data 已是 resolved 值（不会再变）
 * - `errorElement`: 可选自定义错误兜底
 *
 * 设计说明：组件本体不写泛型（与 ReactNode props 转发不兼容），泛型由调用点的
 * `(data) => ...` 推断。这里把 `children` 的 data 类型声明为 `unknown`，调用方用
 * 元组解构或断言补足；如果想强类型，建议改用 `<Await resolve={...}>{(data) => ...}</Await>`
 * 直接写在调用点。
 */
interface AsyncSectionProps {
  // 接受 Promise 或已 resolved 的值。运行期用 instanceof Promise 区分两种形态
  // ——因为 unknown 是所有类型的父类，Promise<unknown> ∪ unknown 会被 TS 化简为 unknown，
  // 这里用 unknown 表达"我接受任何东西"，调用方需自行在 children 内补足类型。
  resolve: unknown;
  fallback: React.ReactNode;
  children: (value: unknown) => React.ReactNode;
  errorElement?: React.ReactNode;
}

function AsyncSection({ resolve, fallback, children, errorElement }: AsyncSectionProps) {
  // 如果上游 loader 直接返回了值（非 Promise），跳过 Suspense 直接渲染
  if (!(resolve instanceof Promise)) {
    return <>{children(resolve)}</>;
  }
  return (
    <React.Suspense fallback={fallback}>
      <Await resolve={resolve} errorElement={errorElement}>
        {(value) => <>{children(value)}</>}
      </Await>
    </React.Suspense>
  );
}

export { AsyncSection };
export type { AsyncSectionProps };
