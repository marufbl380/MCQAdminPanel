import { initAdminApp } from "../startup/initAdminApp.js";

export function boot() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminApp, { once: true });
    return;
  }
  initAdminApp();
}

