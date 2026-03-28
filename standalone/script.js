(() => {
  "use strict";

  // Standalone loader for the v3 legacy admin runtime.
  // The legacy runtime already initializes itself (DOMContentLoaded + UI binding).
  // This wrapper keeps `standalone/index.html` free of ES modules.
  const legacySrcCandidates = [
    "./js/features/admin/adminApp.legacy.js",
    "../js/features/admin/adminApp.legacy.js"
  ];
  const marker = "mcq_adminpanel_standalone_legacy";

  if (document.querySelector(`script[${marker}="true"]`)) {
    return;
  }

  let attemptIndex = 0;
  const tryLoadNext = () => {
    const legacySrc = legacySrcCandidates[attemptIndex];
    attemptIndex += 1;

    const script = document.createElement("script");
    script.src = legacySrc;
    script.defer = true;
    script.setAttribute(marker, "true");

    script.onerror = () => {
      if (attemptIndex < legacySrcCandidates.length) {
        tryLoadNext();
        return;
      }
      // eslint-disable-next-line no-console
      console.error("Standalone load failed: could not fetch", legacySrcCandidates[0], "or fallback.");
      alert(
        "Standalone load failed. See console for details.\n" +
          legacySrcCandidates.map((s) => "- " + s).join("\n")
      );
    };

    document.head.appendChild(script);
  };

  tryLoadNext();
})();

