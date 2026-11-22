import { modes } from "./commands.ts";
import { inheritedShortcutId, shortcutId } from "./utils.ts";
import type { CommandId, KeymapConfig, Mode, ShortcutSettings, SiteConfig, UserConfig } from "./types.ts";

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
  // false = every shortcut is off on this site (global is controlled by the master switch instead)
  enabled: boolean;
  // All-sites shortcuts switched off on this site only, as inheritedKey(mode, keys)
  disabledGlobal: Set<string>;
  modes: Record<Mode, ShortcutDraft[]>;
}

export function inheritedKey(mode: Mode, keys: string): string {
  return `${mode}|${normalizeKeys(keys)}`;
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
  return { name, enabled: true, disabledGlobal: new Set(), modes: siteModes };
}

export function toDraft(config: unknown, settings: ShortcutSettings): SiteDraft[] {
  const disabled = new Set(settings.disabledShortcuts);
  const disabledSites = new Set(settings.disabledSites);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Config must be a JSON object");
  }
  const entries = Object.entries(config as Record<string, unknown>);
  // Global always exists and comes first
  if (!entries.some(([name]) => name === "global")) entries.unshift(["global", {}]);
  entries.sort(([a], [b]) => (a === "global" ? -1 : b === "global" ? 1 : 0));

  const globalSource = (entries[0]?.[1] ?? {}) as Partial<SiteConfig>;

  return entries.map(([name, siteConfig]) => {
    const site = emptySite(name);
    site.enabled = !disabledSites.has(name);
    const source = (siteConfig ?? {}) as Partial<SiteConfig>;
    for (const mode of modes) {
      if (name !== "global") {
        for (const keys of Object.keys(globalSource[mode] ?? {})) {
          if (disabled.has(inheritedShortcutId(name, mode, keys))) site.disabledGlobal.add(inheritedKey(mode, keys));
        }
      }
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

export function fromDraft(sites: SiteDraft[]): { config: UserConfig; settings: ShortcutSettings } {
  const config = {} as UserConfig;
  const disabled: string[] = [];
  const disabledSites: string[] = [];
  const global = sites.find((s) => s.name === "global");
  for (const site of sites) {
    const siteConfig = {} as SiteConfig;
    if (site.name !== "global" && !site.enabled) disabledSites.push(site.name);
    for (const mode of modes) {
      // Only keep per-site switches for All-sites shortcuts that still exist
      if (global && site !== global) {
        for (const row of global.modes[mode]) {
          const keys = normalizeKeys(row.keys);
          if (keys && site.disabledGlobal.has(inheritedKey(mode, keys))) {
            disabled.push(inheritedShortcutId(site.name, mode, keys));
          }
        }
      }
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
  return { config, settings: { disabledShortcuts: [...new Set(disabled)], disabledSites } };
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

// Nav-mode keys that work on a site: enabled All-sites ones it hasn't switched off, then its own on top
function effectiveNavCommands(global: SiteDraft, site: SiteDraft): CommandId[] {
  const keymap = new Map<string, CommandId>();
  for (const row of global.modes.NAV_MODE) {
    const keys = normalizeKeys(row.keys);
    if (row.enabled && keys && !site.disabledGlobal.has(inheritedKey("NAV_MODE", keys))) keymap.set(keys, row.command);
  }
  if (site !== global) {
    for (const row of site.modes.NAV_MODE) {
      const keys = normalizeKeys(row.keys);
      if (row.enabled && keys) keymap.set(keys, row.command);
    }
  }
  return [...keymap.values()];
}

// Sites where the menu couldn't be reopened (it stays reachable even on switched-off sites), so saving is refused
export function sitesWithoutOpenShortcut(sites: SiteDraft[]): string[] {
  const global = sites.find((s) => s.name === "global");
  if (!global) return ["global"];
  return sites
    .filter((site) => !effectiveNavCommands(global, site).includes("open_extension_config"))
    .map((site) => site.name);
}

export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^www\./, "");
}
