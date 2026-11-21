import { clearTokenCookies } from "./cookieUtils";
import { clearStoredReturnUrl, getLoginUrl } from "./returnUrlUtils";

export function switchWorker(workerId: string): void {
  clearTokenCookies();
  clearStoredReturnUrl();
  localStorage.removeItem("litellm_selected_worker_id");
  localStorage.removeItem("litellm_worker_url");

  // Reload the app so it reads the new worker's authentication state at startup.
  const loginUrl = new URL(getLoginUrl(), window.location.origin);
  loginUrl.searchParams.set("worker", workerId);
  window.location.assign(loginUrl.href);
}
