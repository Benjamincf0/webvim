import { modes } from "./commands.ts";
import { shortcutId } from "./utils.ts";
import type { CommandId, KeymapConfig, Mode, SiteConfig, UserConfig } from "./types.ts";

/** ===========================================================================
 * EDITABLE DRAFT OF THE CONFIG
 * The menu edits a list of rows (so keys can be renamed, toggled and briefly
 * duplicated while typing), then converts back to UserConfig on save.
 * ============================================================================ */

export interface ShortcutDraft {
  id: number;
  keys: string;
  command: CommandId;
  enabled: boolean;
}

export interface SiteDraft {
  name: string;
  modes: Record<Mode, ShortcutDraft[]>;
}

let nextRowId = 1;
export function newRowId(): number {
  return nextRowId++;
}

export function normalizeKeys(keys: string): string {
  return keys.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

export function emptySite(name: string): SiteDraft {
  const siteModes = {} as Record<Mode, ShortcutDraft[]>;
  for (const mode of modes) siteModes[mode] = [];
  return { name, modes: siteModes };
}

export function toDraft(config: unknown, disabled: Set<string>): SiteDraft[] {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Config must be a JSON object");
  }
  const entries = Object.entries(config as Record<string, unknown>);
  // Global always exists and comes first
  if (!entries.some(([name]) => name === "global")) entries.unshift(["global", {}]);
  entries.sort(([a], [b]) => (a === "global" ? -1 : b === "global" ? 1 : 0));

  return entries.map(([name, siteConfig]) => {
    const site = emptySite(name);
    const source = (siteConfig ?? {}) as Partial<SiteConfig>;
    for (const mode of modes) {
      site.modes[mode] = Object.entries(source[mode] ?? {}).map(([keys, command]) => ({
        id: newRowId(),
        keys,
        command,
        enabled: !disabled.has(shortcutId(name, mode, keys)),
      }));
    }
    return site;
  });
}

export function fromDraft(sites: SiteDraft[]): { config: UserConfig; disabled: string[] } {
  const config = {} as UserConfig;
  const disabled: string[] = [];
  for (const site of sites) {
    const siteConfig = {} as SiteConfig;
    for (const mode of modes) {
      const keymap: KeymapConfig = {};
      for (const row of site.modes[mode]) {
        const keys = normalizeKeys(row.keys);
        if (!keys) continue;
        keymap[keys] = row.command;
        if (!row.enabled) disabled.push(shortcutId(site.name, mode, keys));
      }
      siteConfig[mode] = keymap;
    }
    config[site.name] = siteConfig;
  }
  return { config, disabled };
}

// Row id -> problem with that row
export function validateDraft(sites: SiteDraft[]): Map<number, string> {
  const errors = new Map<number, string>();
  for (const site of sites) {
    for (const mode of modes) {
      const seen = new Set<string>();
      for (const row of site.modes[mode]) {
        const keys = normalizeKeys(row.keys);
        if (!keys) {
          errors.set(row.id, "Enter a key or record one");
        } else if (seen.has(keys)) {
          errors.set(row.id, `"${keys}" is already used in this mode`);
        }
        seen.add(keys);
      }
    }
  }
  return errors;
}

// Without this the menu can't be reopened, so the menu refuses to save without one
export function hasOpenShortcut(sites: SiteDraft[]): boolean {
  const global = sites.find((s) => s.name === "global");
  return !!global?.modes.NAV_MODE.some(
    (row) => row.enabled && row.command === "open_extension_config" && normalizeKeys(row.keys),
  );
}

export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^www\./, "");
}
