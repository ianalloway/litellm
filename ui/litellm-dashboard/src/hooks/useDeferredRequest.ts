import { useEffect } from "react";

/** Start a request after commit, coalescing effects replaced before the request begins. */
export function useDeferredRequest(request: () => unknown, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    queueMicrotask(() => {
      if (active) void request();
    });
    return () => { active = false; };
  }, [enabled, request]);
}
