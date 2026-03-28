import { appState } from "../core/state.js";
import { getUi } from "../core/ui.js";

export function initApp() {
  const ui = getUi();
  // Expose UI onto state for feature modules (single shared object).
  appState.ui = ui;

  // Bridge while migrating: load legacy `script.js` if modular app isn't ready yet.
  // This keeps the UI usable while we extract feature modules.
  const existing = document.querySelector("script[data-legacy-admin='true']");
  if (existing) {
    return;
  }
  const script = document.createElement("script");
  script.src = "js/features/admin/adminApp.legacy.js";
  script.defer = true;
  script.dataset.legacyAdmin = "true";
  document.head.appendChild(script);
}

