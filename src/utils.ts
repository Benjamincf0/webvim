import type { UserConfig, Mode, KeymapConfig } from "./types.js";

export const waitFor = (
  s: string,
  c: (el: Element) => void,
  o: MutationObserver = new MutationObserver(() => {
    const e = document.querySelector(s);
    if (e) {
      o.disconnect();
      c(e);
    }
  }),
): MutationObserver => (
  o.observe(document.body, { childList: true, subtree: true }),
  o
);

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

export function generateEffectiveKeymap(
  config: UserConfig,
  hostname: string,
  currentMode: Mode,
): KeymapConfig {
  let effectiveMap: KeymapConfig = { ...config.global[currentMode] };
  const siteKey = Object.keys(config).find((site) => hostname.includes(site));

  if (siteKey && config[siteKey]) {
    const siteConfig = config[siteKey] as Record<Mode, KeymapConfig>;
    if (siteConfig[currentMode]) {
      effectiveMap = { ...effectiveMap, ...siteConfig[currentMode] };
    }
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
