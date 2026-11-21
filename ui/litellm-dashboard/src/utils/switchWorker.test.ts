import { afterEach, expect, it, vi } from "vitest";
import { clearTokenCookies } from "./cookieUtils";
import { clearStoredReturnUrl } from "./returnUrlUtils";
import { switchWorker } from "./switchWorker";

vi.mock("./cookieUtils", () => ({ clearTokenCookies: vi.fn() }));
vi.mock("./returnUrlUtils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./returnUrlUtils")>()),
  clearStoredReturnUrl: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("clears previous worker state and reloads login with the encoded worker ID", () => {
  const assign = vi.fn();
  localStorage.setItem("litellm_selected_worker_id", "previous");
  localStorage.setItem("litellm_worker_url", "https://previous.example");
  vi.stubGlobal("window", { location: { origin: "https://dashboard.example", assign } });

  switchWorker("new/worker & east");

  expect(clearTokenCookies).toHaveBeenCalledOnce();
  expect(clearStoredReturnUrl).toHaveBeenCalledOnce();
  expect(localStorage.getItem("litellm_selected_worker_id")).toBeNull();
  expect(localStorage.getItem("litellm_worker_url")).toBeNull();
  expect(assign).toHaveBeenCalledOnce();
  const destination = new URL(assign.mock.calls[0][0]);
  expect(destination.origin).toBe("https://dashboard.example");
  expect(destination.pathname).toBe("/ui/login/");
  expect(destination.searchParams.get("worker")).toBe("new/worker & east");
});
