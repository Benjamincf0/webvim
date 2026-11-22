import type { UserConfig, Mode, KeymapConfig } from "./types.js";

export const waitFor = (s: string, c: (el: Element) => void): MutationObserver => {
  const o = new MutationObserver(() => {
    const e = document.querySelector(s);
    if (e) {
      o.disconnect();
      c(e);
    }
  });

  // The element may already exist (no mutation would ever fire), and at
  // document_start <body> is null, so observe the root element instead
  const existing = document.querySelector(s);
  if (existing) {
    c(existing);
    return o;
  }
  o.observe(document.documentElement, { childList: true, subtree: true });
  return o;
};

export const log = {
  info: (...args: unknown[]) => console.log("[BetterWeb]", ...args),
  warn: (...args: unknown[]) => console.warn("[BetterWeb]", ...args),
  error: (...args: unknown[]) => console.error("[BetterWeb]", ...args),
};

export function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];

  const isMac = navigator.userAgent.includes("Mac");
  const modPressed = isMac ? event.metaKey : event.ctrlKey;

  if (modPressed) {
    parts.push("mod");
  } else if (event.ctrlKey) {
    parts.push("ctrl");
  } else if (event.metaKey) {
    parts.push("meta");
  }

  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  const key = event.key.toLowerCase();
  if (!["control", "alt", "meta", "shift"].includes(key)) {
    parts.push(key);
  }

  return parts.join("+");
}

// Identifies one shortcut for the list of shortcuts the user switched off in the menu
export function shortcutId(site: string, mode: Mode, keys: string): string {
  return `${site}|${mode}|${keys}`;
}

export function generateEffectiveKeymap(
  config: UserConfig,
  hostname: string,
  currentMode: Mode,
  disabled: Set<string> = new Set(),
): KeymapConfig {
  // Disabled site shortcuts are dropped before merging, so the global binding for that key applies again
  const enabledOnly = (site: string, keymap: KeymapConfig | undefined): KeymapConfig =>
    Object.fromEntries(
      Object.entries(keymap ?? {}).filter(([keys]) => !disabled.has(shortcutId(site, currentMode, keys))),
    );

  let effectiveMap: KeymapConfig = enabledOnly("global", config.global?.[currentMode]);
  const siteKey = Object.keys(config).find((site) => hostname.includes(site));

  if (siteKey && siteKey !== "global" && config[siteKey]) {
    const siteConfig = config[siteKey] as Record<Mode, KeymapConfig>;
    effectiveMap = { ...effectiveMap, ...enabledOnly(siteKey, siteConfig[currentMode]) };
  }
  log.info(effectiveMap);
  return effectiveMap;
}

export function isUserTyping(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const nonTyping = [
      "button",
      "checkbox",
      "radio",
      "submit",
      "reset",
      "file",
      "image",
    ];
    return (
      !(el as HTMLInputElement).type &&
      !nonTyping.includes((el as HTMLInputElement).type)
    );
  }
  return (el as HTMLElement).isContentEditable;
}

export function triggerKeyDown(key: string, code: number): void {
  const event = new KeyboardEvent("keydown", {
    key: key,
    code: key,
    keyCode: code, // Included for legacy support
    which: code, // Included for legacy support
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
}
