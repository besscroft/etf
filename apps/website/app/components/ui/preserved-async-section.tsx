import * as React from "react";
import { Await } from "react-router";

interface PreservedAsyncSectionProps<T> {
  children: (value: T, pending: boolean) => React.ReactNode;
  errorElement?: React.ReactNode;
  fallback: React.ReactNode;
  onRetry?: () => void;
  resolve: PromiseLike<T> | T;
}

interface AsyncState<T> {
  error: unknown;
  pending: boolean;
  value: T;
}

/**
 * Renders a deferred value without replacing an already-resolved view during
 * later navigations or revalidations. The first request still uses Suspense.
 */
export function PreservedAsyncSection<T>({
  children,
  errorElement,
  fallback,
  onRetry,
  resolve,
}: PreservedAsyncSectionProps<T>) {
  const [state, setState] = React.useState<AsyncState<T> | null>(null);
  const handleResolved = React.useCallback(
    (value: T) => setState({ error: null, pending: false, value }),
    [],
  );

  React.useEffect(() => {
    setState((current) => (current ? { ...current, error: null, pending: true } : current));

    let active = true;
    Promise.resolve(resolve).then(
      (value) => {
        if (active) setState({ error: null, pending: false, value });
      },
      (error: unknown) => {
        if (active) {
          setState((current) => (current ? { ...current, error, pending: false } : current));
        }
      },
    );

    return () => {
      active = false;
    };
  }, [resolve]);

  if (state) {
    return (
      <AsyncFrame error={state.error} onRetry={onRetry} pending={state.pending}>
        {children(state.value, state.pending)}
      </AsyncFrame>
    );
  }

  return (
    <React.Suspense fallback={fallback}>
      <Await resolve={resolve} errorElement={errorElement}>
        {(value) => (
          <CaptureResolvedValue value={value as T} onResolved={handleResolved}>
            {children(value as T, false)}
          </CaptureResolvedValue>
        )}
      </Await>
    </React.Suspense>
  );
}

function CaptureResolvedValue<T>({
  children,
  onResolved,
  value,
}: {
  children: React.ReactNode;
  onResolved: (value: T) => void;
  value: T;
}) {
  React.useEffect(() => onResolved(value), [onResolved, value]);
  return <>{children}</>;
}

function AsyncFrame({
  children,
  error,
  onRetry,
  pending,
}: {
  children: React.ReactNode;
  error: unknown;
  onRetry?: () => void;
  pending: boolean;
}) {
  return (
    <div className="relative min-w-0">
      {children}
      {(pending || Boolean(error)) && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm">
            {error ? "更新失败，已保留上次数据" : "正在更新"}
          </span>
          {error && onRetry ? (
            <button
              type="button"
              className="pointer-events-auto border bg-background px-2 py-1 text-foreground shadow-sm hover:bg-muted"
              onClick={onRetry}
            >
              重试
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
