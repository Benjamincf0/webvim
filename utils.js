export const waitFor = (
  s,
  c,
  o = new MutationObserver(() => {
    const e = document.querySelector(s);
    if (e) {
      o.disconnect();
      c(e);
    }
  }),
) => (o.observe(document.body, { childList: !0, subtree: !0 }), o);

export function waitForElement(selector) {
  return new Promise((resolve) => {
    // Check if it's already there before we even start watching
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  });
}

export const log = {
  info: (...args) => console.log("[BetterWeb]", ...args),
  warn: (...args) => console.warn("[BetterWeb]", ...args),
  error: (...args) => console.error("[BetterWeb]", ...args),
};

// Usage
log.info("This is from my extension");

/** ===========================================================================
 * MODULE 2: KEY UTILITIES & RESOLVER
 * ============================================================================ */
export function normalizeKey(event) {
  const parts = [];

  // Use 'mod' to map to Cmd on Mac and Ctrl on Windows
  const isMac = navigator.userAgent.includes("Mac");
  const modPressed = isMac ? event.metaKey : event.ctrlKey;

  if (modPressed)
    parts.push("mod"); // If we aren't using the OS specific mod key, check standard ctrl/meta
  else if (event.ctrlKey) parts.push("ctrl");
  else if (event.metaKey) parts.push("meta");

  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  // Filter out standalone modifier key presses
  const key = event.key.toLowerCase();
  if (!["control", "alt", "meta", "shift"].includes(key)) {
    parts.push(key);
  }

  return parts.join("+");
}

export function generateEffectiveKeymap(config, hostname, currentMode) {
  let effectiveMap = { ...config["global"][currentMode] };
  const siteKey = Object.keys(config).find((site) => hostname.includes(site));

  if (siteKey) {
    effectiveMap = { ...effectiveMap, ...config[siteKey][currentMode] };
  }
  log.info(effectiveMap);
  return effectiveMap;
}
