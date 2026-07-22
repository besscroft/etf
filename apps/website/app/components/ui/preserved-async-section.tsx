import * as React from "react";
import { Await } from "react-router";

interface PreservedAsyncSectionProps<T> {
  children: (value: T, pending: boolean) => React.ReactNode;
  errorElement?: React.ReactNode;
  fallback: React.ReactNode;
  onRetry?: () => void;
  resolve: PromiseLike<T> | T;
  showPendingStatus?: boolean;
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
  showPendingStatus = true,
}: PreservedAsyncSectionProps<T>) {
  const [state, setState] = React.useState<AsyncState<T> | null>(null);
  const requestIdRef = React.useRef(0);
  const handleResolved = React.useCallback(
    (value: T) => setState({ error: null, pending: false, value }),
    [],
  );

  React.useEffect(() => {
    const requestId = ++requestIdRef.current;
    setState((current) => (current ? { ...current, error: null, pending: true } : current));

    let active = true;
    Promise.resolve(resolve).then(
      (value) => {
        if (active && requestId === requestIdRef.current) {
          setState({ error: null, pending: false, value });
        }
      },
      (error: unknown) => {
        if (active && requestId === requestIdRef.current) {
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
      <AsyncFrame
        error={state.error}
        onRetry={onRetry}
        pending={state.pending}
        showPendingStatus={showPendingStatus}
      >
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
  showPendingStatus,
}: {
  children: React.ReactNode;
  error: unknown;
  onRetry?: () => void;
  pending: boolean;
  showPendingStatus: boolean;
}) {
  const showStatus = Boolean(error) || (pending && showPendingStatus);

  return (
    <div className="relative min-w-0">
      {children}
      {showStatus && (
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
