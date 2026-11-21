import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDeferredRequest } from "./useDeferredRequest";

describe("useDeferredRequest", () => {
  it("coalesces strict-mode setup and starts a newly enabled request once", async () => {
    const request = vi.fn();
    const { rerender } = renderHook((enabled) => useDeferredRequest(request, enabled), {
      initialProps: false,
      wrapper: StrictMode,
    });

    await act(async () => {});
    expect(request).not.toHaveBeenCalled();
    rerender(true);
    await act(async () => {});
    expect(request).toHaveBeenCalledTimes(1);
    rerender(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("drops a replaced request and cancels an unmounted request before it starts", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook((request) => useDeferredRequest(request), {
      initialProps: first,
      wrapper: StrictMode,
    });
    rerender(second);
    await act(async () => {});
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    rerender(first);
    unmount();
    await act(async () => {});
    expect(first).not.toHaveBeenCalled();
  });
});
