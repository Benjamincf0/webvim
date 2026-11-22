import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from "react";
import { log, matchSite, normalizeKey } from "./utils.ts";
import { commandGroups, commandInfo, modeLabels, modes } from "./commands.ts";
import {
  emptySite,
  fromDraft,
  inheritedKey,
  newRowId,
  normalizeHostname,
  normalizeKeys,
  sitesWithoutOpenShortcut,
  toDraft,
  validateDraft,
} from "./configDraft.ts";
import type { ShortcutDraft, SiteDraft } from "./configDraft.ts";
import type { CommandId, Mode, ShortcutSettings, UserConfig } from "./types.ts";

/** ===========================================================================
 * SMALL CONTROLS
 * ============================================================================ */

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  small?: boolean;
};

function Toggle({ checked, onChange, label, small = false }: ToggleProps): ReactElement {
  const track = small ? "h-[16px] w-[28px]" : "h-[22px] w-[40px]";
  const knob = small ? "h-[12px] w-[12px]" : "h-[18px] w-[18px]";
  const on = small ? "ml-[14px]" : "ml-[20px]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative ${track} shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors ${
        checked ? "bg-blue-600" : "bg-zinc-700"
      }`}
    >
      {/* margin instead of translate: Tailwind's transform vars don't initialise inside shadow DOM */}
      <span className={`block ${knob} rounded-full bg-white transition-all ${checked ? on : "ml-[2px]"}`} />
    </button>
  );
}

type KeyInputProps = {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  autoFocus: boolean;
};

const modifierKeys = ["Control", "Alt", "Meta", "Shift"];

// Type keys as text ("ctrl+g e", "<number>j"), or press ● and type the shortcut itself
function KeyInput({ value, onChange, invalid, autoFocus }: KeyInputProps): ReactElement {
  const [recording, setRecording] = useState<boolean>(false);
  const strokes = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function stopRecording(): void {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRecording(false);
  }

  function startRecording(): void {
    strokes.current = [];
    setRecording(true);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    if (!recording) return;
    // Every key belongs to the shortcut being recorded, including Escape and Enter
    e.preventDefault();
    e.stopPropagation();
    if (modifierKeys.includes(e.key)) return;
    strokes.current.push(normalizeKey(e.nativeEvent));
    onChange(strokes.current.join(" "));
    // A pause ends the sequence, so multi-key shortcuts like "d d" can be recorded
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(stopRecording, 1200);
  }

  return (
    <div
      className={`flex min-w-0 items-center rounded-md border bg-zinc-950 ${
        recording ? "border-blue-500" : invalid ? "border-red-500" : "border-zinc-700 focus-within:border-zinc-500"
      }`}
    >
      <input
        ref={inputRef}
        value={recording && strokes.current.length === 0 ? "" : value}
        placeholder={recording ? "Press keys…" : "e.g. ctrl+g e"}
        readOnly={recording}
        autoFocus={autoFocus}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={stopRecording}
        className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 font-mono text-[12.5px] text-zinc-100 outline-none placeholder:text-zinc-600"
      />
      <button
        type="button"
        title={recording ? "Recording — pause to finish" : "Record shortcut"}
        aria-label="Record shortcut"
        // Keep focus in the input so the keys land there
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (recording ? stopRecording() : startRecording())}
        className={`mr-1 cursor-pointer rounded border-0 bg-transparent px-1.5 py-0.5 text-[11px] leading-none ${
          recording ? "animate-pulse text-red-400" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        }`}
      >
        ●
      </button>
    </div>
  );
}

type CommandSelectProps = {
  value: CommandId;
  onChange: (value: CommandId) => void;
};

function CommandSelect({ value, onChange }: CommandSelectProps): ReactElement {
  const known = value in commandInfo;
  return (
    <select
      value={value}
      title={value}
      onChange={(e) => onChange(e.target.value as CommandId)}
      className="min-w-0 cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[13px] text-zinc-100 outline-none [color-scheme:dark] focus:border-zinc-500"
    >
      {!known && <option value={value}>Unknown: {value}</option>}
      {commandGroups.map((group) => (
        <optgroup key={group} label={group}>
          {(Object.keys(commandInfo) as CommandId[])
            .filter((id) => commandInfo[id].group === group)
            .map((id) => (
              <option key={id} value={id}>
                {commandInfo[id].label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

/** ===========================================================================
 * SHORTCUT LIST FOR ONE SITE
 * ============================================================================ */

type ShortcutRowProps = {
  row: ShortcutDraft;
  error: string | undefined;
  autoFocus: boolean;
  onChange: (patch: Partial<ShortcutDraft>) => void;
  onRemove: () => void;
};

function ShortcutRow({ row, error, autoFocus, onChange, onRemove }: ShortcutRowProps): ReactElement {
  return (
    <li className="border-b border-zinc-800/70 py-2 last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-3">
        <Toggle small checked={row.enabled} onChange={(enabled) => onChange({ enabled })} label="Enable shortcut" />
        <div className={row.enabled ? "" : "opacity-50"}>
          <KeyInput
            value={row.keys}
            invalid={!!error}
            autoFocus={autoFocus}
            onChange={(keys) => onChange({ keys })}
          />
        </div>
        <div className={`grid ${row.enabled ? "" : "opacity-50"}`}>
          <CommandSelect value={row.command} onChange={(command) => onChange({ command })} />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove shortcut"
          title="Remove shortcut"
          className="cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[15px] leading-none text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          ×
        </button>
      </div>
      {error && <p className="m-0 mt-1 pl-[40px] text-[12px] text-red-400">{error}</p>}
    </li>
  );
}

type InheritedRowProps = {
  row: ShortcutDraft;
  status: "on" | "off" | "off-everywhere" | "replaced";
  onToggle: (on: boolean) => void;
};

// An All-sites shortcut seen from one site: it can be switched off here without touching other sites
function InheritedRow({ row, status, onToggle }: InheritedRowProps): ReactElement {
  const note =
    status === "off-everywhere" ? "Off on all sites" : status === "replaced" ? "Replaced by this site's shortcut" : null;
  const active = status === "on";
  return (
    <li className="border-b border-zinc-800/70 py-2 last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-3">
        {note ? (
          <span className="w-[28px]" />
        ) : (
          <Toggle small checked={active} onChange={onToggle} label="Enable on this site" />
        )}
        <kbd
          className={`min-w-0 truncate px-2 py-1 font-mono text-[12.5px] ${active ? "text-zinc-200" : "text-zinc-500 line-through"}`}
        >
          {normalizeKeys(row.keys)}
        </kbd>
        <span className={`min-w-0 truncate px-2 text-[13px] ${active ? "text-zinc-300" : "text-zinc-500"}`}>
          {commandInfo[row.command]?.label ?? row.command}
        </span>
        <span className="text-right text-[11px] text-zinc-500">{note}</span>
      </div>
    </li>
  );
}

type SitePanelProps = {
  site: SiteDraft;
  global: SiteDraft;
  isCurrent: boolean;
  errors: Map<number, string>;
  focusRowId: number | null;
  onChangeRow: (mode: Mode, id: number, patch: Partial<ShortcutDraft>) => void;
  onAddRow: (mode: Mode) => void;
  onRemoveRow: (mode: Mode, id: number) => void;
  onRemoveSite: () => void;
  onToggleSite: (on: boolean) => void;
  onToggleInherited: (mode: Mode, keys: string, on: boolean) => void;
};

function SitePanel(props: SitePanelProps): ReactElement {
  const { site, global, isCurrent, errors, focusRowId, onChangeRow, onAddRow, onRemoveRow } = props;
  const isGlobal = site === global;

  function inheritedStatus(mode: Mode, row: ShortcutDraft): InheritedRowProps["status"] {
    const keys = normalizeKeys(row.keys);
    if (site.modes[mode].some((own) => own.enabled && normalizeKeys(own.keys) === keys)) return "replaced";
    if (!row.enabled) return "off-everywhere";
    return site.disabledGlobal.has(inheritedKey(mode, keys)) ? "off" : "on";
  }

  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold">
            {isGlobal ? "All sites" : site.name}
            {isCurrent && (
              <span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-[11px] font-medium text-blue-300">
                this site
              </span>
            )}
          </h2>
          <p className="m-0 mt-1 text-[12px] text-zinc-400">
            {isGlobal
              ? "Shortcuts that work everywhere. Each site can switch them off or replace them."
              : `Shortcuts from All sites apply here too. Switch them off here, or add a key to replace one on ${site.name}.`}
          </p>
        </div>
        {!isGlobal && (
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-300">
              On for this site
              <Toggle checked={site.enabled} onChange={props.onToggleSite} label={`Enable shortcuts on ${site.name}`} />
            </label>
            <button
              type="button"
              onClick={props.onRemoveSite}
              className="cursor-pointer rounded-md border border-zinc-700 bg-transparent px-2.5 py-1 text-[12px] text-zinc-300 hover:border-red-500/60 hover:text-red-400"
            >
              Remove site
            </button>
          </div>
        )}
      </div>

      {!site.enabled && (
        <p className="m-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-200">
          All shortcuts are off on {site.name}. Only the shortcut that opens this menu still works there.
        </p>
      )}

      <div className={`flex flex-col gap-5 ${site.enabled ? "" : "opacity-50"}`}>
        {modes.map((mode) => {
          const rows = site.modes[mode];
          const inherited = isGlobal ? [] : global.modes[mode].filter((row) => normalizeKeys(row.keys));
          return (
            <section key={mode}>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <h3 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {modeLabels[mode]} mode
                  <span className="ml-2 font-normal text-zinc-600">{rows.length + inherited.length}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => onAddRow(mode)}
                  className="cursor-pointer rounded-md border-0 bg-transparent px-2 py-0.5 text-[12px] text-blue-400 hover:bg-zinc-800"
                >
                  + Add
                </button>
              </div>
              {rows.length === 0 && inherited.length === 0 && (
                <p className="m-0 py-2 text-[12px] text-zinc-600">No shortcuts</p>
              )}
              {rows.length > 0 && (
                <ul className="m-0 list-none p-0">
                  {rows.map((row) => (
                    <ShortcutRow
                      key={row.id}
                      row={row}
                      error={errors.get(row.id)}
                      autoFocus={row.id === focusRowId}
                      onChange={(patch) => onChangeRow(mode, row.id, patch)}
                      onRemove={() => onRemoveRow(mode, row.id)}
                    />
                  ))}
                </ul>
              )}
              {inherited.length > 0 && (
                <>
                  <p className="m-0 mt-2 text-[11px] text-zinc-500">From All sites</p>
                  <ul className="m-0 list-none p-0">
                    {inherited.map((row) => (
                      <InheritedRow
                        key={row.id}
                        row={row}
                        status={inheritedStatus(mode, row)}
                        onToggle={(on) => props.onToggleInherited(mode, row.keys, on)}
                      />
                    ))}
                  </ul>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** ===========================================================================
 * CONFIG MODAL
 * ============================================================================ */

type ConfigModalProps = {
  config: UserConfig;
  settings: ShortcutSettings;
  hostname: string;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => Promise<void>;
  onClose: () => void;
  onSave: (config: UserConfig, settings: ShortcutSettings) => Promise<void>;
};

// Mounted fresh on every open, so the draft starts as the live config on the very first render
export function ConfigModal(props: ConfigModalProps): ReactElement {
  const { config, settings, hostname, onToggleEnabled, onClose, onSave } = props;
  const [enabled, setEnabled] = useState<boolean>(props.enabled);
  const [sites, setSites] = useState<SiteDraft[]>(() => toDraft(config, settings));
  const [selected, setSelected] = useState<string>(
    () => matchSite(Object.keys(config), hostname) ?? "global",
  );
  const [view, setView] = useState<"list" | "json">("list");
  const [jsonDraft, setJsonDraft] = useState<string>("");
  const [newSite, setNewSite] = useState<string>("");
  const [focusRowId, setFocusRowId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [confirmDiscard, setConfirmDiscard] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const rowErrors = useMemo(() => validateDraft(sites), [sites]);
  const currentSite = matchSite(
    sites.map((s) => s.name),
    hostname,
  );
  const site = sites.find((s) => s.name === selected) ?? sites[0];
  const globalSite = sites.find((s) => s.name === "global");
  const defaultNewSite = normalizeHostname(hostname);

  // Focus after the opening keystroke has finished, or its character lands in the menu
  useEffect(() => {
    const id = setTimeout(() => dialogRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, []);

  function edit(update: (sites: SiteDraft[]) => SiteDraft[]): void {
    setSites(update);
    setDirty(true);
    setConfirmDiscard(false);
    setError(null);
  }

  function editSite(name: string, update: (site: SiteDraft) => SiteDraft): void {
    edit((all) => all.map((s) => (s.name === name ? update(s) : s)));
  }

  function editMode(mode: Mode, update: (rows: ShortcutDraft[]) => ShortcutDraft[]): void {
    if (!site) return;
    editSite(site.name, (s) => ({ ...s, modes: { ...s.modes, [mode]: update(s.modes[mode]) } }));
  }

  function addRow(mode: Mode): void {
    const id = newRowId();
    setFocusRowId(id);
    editMode(mode, (rows) => [...rows, { id, keys: "", command: "scroll_down", enabled: true }]);
  }

  function addSite(): void {
    const name = normalizeHostname(newSite) || defaultNewSite;
    if (!name || name === "global") return;
    if (!sites.some((s) => s.name === name)) edit((all) => [...all, emptySite(name)]);
    setSelected(name);
    setNewSite("");
  }

  function removeSite(name: string): void {
    edit((all) => all.filter((s) => s.name !== name));
    setSelected("global");
  }

  function parseJson(): SiteDraft[] | null {
    try {
      // Toggles aren't part of the JSON, so carry them over from the list
      return toDraft(JSON.parse(jsonDraft), fromDraft(sites).settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return null;
    }
  }

  function switchView(): void {
    if (view === "list") {
      setJsonDraft(JSON.stringify(fromDraft(sites).config, null, 2));
      setError(null);
      setView("json");
      return;
    }
    const parsed = parseJson();
    if (!parsed) return;
    setSites(parsed);
    if (!parsed.some((s) => s.name === selected)) setSelected("global");
    setView("list");
  }

  async function save(): Promise<void> {
    let draft = sites;
    if (view === "json") {
      const parsed = parseJson();
      if (!parsed) return;
      draft = parsed;
      setSites(parsed);
    }
    const errors = validateDraft(draft);
    if (errors.size > 0) {
      setView("list");
      const bad = draft.find((s) => modes.some((m) => s.modes[m].some((r) => errors.has(r.id))));
      if (bad) setSelected(bad.name);
      setError("Fix the highlighted shortcuts before saving.");
      return;
    }
    const unreachable = sitesWithoutOpenShortcut(draft);
    if (unreachable.length > 0) {
      const where = unreachable.map((name) => (name === "global" ? "All sites" : name)).join(", ");
      setError(`Keep an enabled “Open this menu” shortcut in Nav mode, or you can't get back here (${where}).`);
      return;
    }
    setSaving(true);
    try {
      const { config: nextConfig, settings: nextSettings } = fromDraft(draft);
      await onSave(nextConfig, nextSettings);
      onClose();
    } catch (e) {
      setError("Couldn't save config");
      log.error(e);
    } finally {
      setSaving(false);
    }
  }

  function requestClose(): void {
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Escape") {
      e.preventDefault();
      requestClose();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4 font-sans text-[14px] leading-normal antialiased"
      onClick={requestClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bw-title"
        className="flex h-[min(680px,88vh)] w-full max-w-[880px] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 outline-none [box-shadow:0_24px_64px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-3">
          <h1 id="bw-title" className="m-0 text-[16px] font-semibold">
            BetterWeb shortcuts
          </h1>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-zinc-300">
              Shortcuts enabled
              <Toggle
                checked={enabled}
                label="Enable shortcuts"
                onChange={(next) => {
                  setEnabled(next);
                  onToggleEnabled(next).catch((e: unknown) => {
                    setEnabled(!next);
                    log.error(e);
                  });
                }}
              />
            </label>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[18px] leading-none text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              ×
            </button>
          </div>
        </header>

        {view === "list" ? (
          <div className="flex min-h-0 flex-1">
            <nav className="flex w-[210px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/40">
              <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-2">
                {sites.map((s) => {
                  const count = modes.reduce((n, m) => n + s.modes[m].length, 0);
                  const hasError = modes.some((m) => s.modes[m].some((r) => rowErrors.has(r.id)));
                  const active = s.name === site?.name;
                  return (
                    <li key={s.name}>
                      <button
                        type="button"
                        onClick={() => setSelected(s.name)}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-md border-0 px-2.5 py-1.5 text-left text-[13px] ${
                          active ? "bg-zinc-800 text-zinc-100" : "bg-transparent text-zinc-300 hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{s.name === "global" ? "All sites" : s.name}</span>
                        {s.name === currentSite && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" title="This site" />
                        )}
                        {!s.enabled && (
                          <span className="shrink-0 rounded bg-zinc-800 px-1 text-[10px] uppercase text-zinc-400">off</span>
                        )}
                        {hasError && <span className="shrink-0 text-[12px] text-red-400">!</span>}
                        <span className="shrink-0 text-[11px] text-zinc-500">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <form
                className="flex gap-1.5 border-t border-zinc-800 p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addSite();
                }}
              >
                <input
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  placeholder={defaultNewSite || "example.com"}
                  spellCheck={false}
                  aria-label="Add site"
                  className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[12px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                />
                <button
                  type="submit"
                  title="Add site"
                  className="cursor-pointer rounded-md border-0 bg-zinc-800 px-2 text-[13px] text-zinc-200 hover:bg-zinc-700"
                >
                  +
                </button>
              </form>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {site && globalSite && (
                <SitePanel
                  site={site}
                  global={globalSite}
                  isCurrent={site.name === currentSite}
                  errors={rowErrors}
                  focusRowId={focusRowId}
                  onChangeRow={(mode, id, patch) =>
                    editMode(mode, (rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
                  }
                  onAddRow={addRow}
                  onRemoveRow={(mode, id) => editMode(mode, (rows) => rows.filter((r) => r.id !== id))}
                  onRemoveSite={() => removeSite(site.name)}
                  onToggleSite={(on) => editSite(site.name, (s) => ({ ...s, enabled: on }))}
                  onToggleInherited={(mode, keys, on) =>
                    editSite(site.name, (s) => {
                      const disabledGlobal = new Set(s.disabledGlobal);
                      if (on) disabledGlobal.delete(inheritedKey(mode, keys));
                      else disabledGlobal.add(inheritedKey(mode, keys));
                      return { ...s, disabledGlobal };
                    })
                  }
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            <textarea
              value={jsonDraft}
              spellCheck={false}
              autoFocus
              onChange={(e) => {
                setJsonDraft(e.target.value);
                setDirty(true);
                setError(null);
              }}
              className="block min-h-0 w-full flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-[12.5px] leading-relaxed text-zinc-100 outline-none focus:border-blue-500"
            />
          </div>
        )}

        {error && (
          <p className="m-0 border-t border-red-500/30 bg-red-500/10 px-5 py-2 text-[12.5px] text-red-300">{error}</p>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={switchView}
              className="cursor-pointer rounded-md border-0 bg-transparent px-0 text-[12px] text-zinc-400 underline-offset-2 hover:text-zinc-100 hover:underline"
            >
              {view === "list" ? "Edit as JSON" : "Back to list"}
            </button>
            <span className={`text-[12px] ${confirmDiscard ? "text-amber-300" : "text-zinc-500"}`}>
              {confirmDiscard ? (
                "Unsaved changes — press Esc again to discard"
              ) : (
                <>
                  <kbd className="font-mono">Esc</kbd> to close · <kbd className="font-mono">⌘/Ctrl+Enter</kbd> to save
                </>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md border border-zinc-700 bg-transparent px-3 py-1.5 text-[13px] text-zinc-200 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="cursor-pointer rounded-md border-0 bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-500 disabled:cursor-default disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
