import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from "react";
import { log, waitFor } from "./utils.js";
import { ExtensionCore } from "./core.ts";
import type { UserConfig } from "./types.ts";
import styles from "./index.css?inline";

/** ===========================================================================
 * CONFIG MODAL (React)
 * ============================================================================ */

type ConfigModalProps = {
  config: UserConfig;
  onClose: () => void;
  onSave: (config: UserConfig) => Promise<void>;
};

// Mounted fresh on every open, so the draft starts as the live config on the very first render
function ConfigModal({ config, onClose, onSave }: ConfigModalProps): ReactElement {
  const [draft, setDraft] = useState<string>(() => JSON.stringify(config, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus after the opening keystroke has finished, or its character gets typed into the editor
  useEffect(() => {
    const id = setTimeout(() => textareaRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, []);

  async function save(): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed as UserConfig);
      onClose();
    } catch (e) {
      setError("Couldn't save config");
      log.error(e);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save();
    } else if (e.key === "Tab" && e.target === textareaRef.current) {
      // Insert two spaces instead of moving focus out of the editor
      e.preventDefault();
      const el = e.currentTarget.querySelector("textarea");
      if (!el) return;
      const { selectionStart, selectionEnd } = el;
      const next = draft.slice(0, selectionStart) + "  " + draft.slice(selectionEnd);
      setDraft(next);
      requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4 font-sans text-[14px] leading-normal antialiased"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bw-title"
        className="flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 [box-shadow:0_24px_64px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <h1 id="bw-title" className="m-0 text-[16px] font-semibold">
              BetterWeb shortcuts
            </h1>
            <p className="m-0 mt-1 text-[13px] text-zinc-400">
              Edit your keymap as JSON. Changes apply immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[18px] leading-none text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 px-5 py-4">
          <textarea
            ref={textareaRef}
            value={draft}
            spellCheck={false}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            className={`block h-[360px] min-h-[160px] w-full resize-y rounded-lg border bg-zinc-950 p-3 font-mono text-[12.5px] leading-relaxed text-zinc-100 outline-none focus:border-blue-500 ${
              error ? "border-red-500" : "border-zinc-700"
            }`}
          />
          {error && <p className="m-0 font-mono text-[12px] text-red-400">{error}</p>}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-3">
          <span className="text-[12px] text-zinc-500">
            <kbd className="font-mono">Esc</kbd> to close · <kbd className="font-mono">⌘/Ctrl+Enter</kbd> to save
          </span>
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

/** ===========================================================================
 * UI MANAGER
 * ============================================================================ */

export class UIManager {
  core: ExtensionCore;
  host!: HTMLDivElement;
  root!: Root;
  isOpen: boolean;

  constructor(core: ExtensionCore) {
    this.core = core;
    this.isOpen = false;
  }

  async initUI(): Promise<void> {
    await new Promise<void>((resolve) => {
      waitFor("body", () => resolve());
    });

    this.host = document.createElement("div");
    document.body.appendChild(this.host);
    const shadow = this.host.attachShadow({ mode: "open" });

    // Tailwind styles must live inside the shadow root to apply to the React tree
    const style = document.createElement("style");
    style.textContent = styles;
    shadow.appendChild(style);

    const container = document.createElement("div");
    shadow.appendChild(container);
    this.root = createRoot(container);
    this.render();
  }

  render(): void {
    this.root?.render(
      this.isOpen ? (
        <ConfigModal
          config={this.core.config}
          onClose={() => this.hideUI()}
          onSave={(config) => this.saveConfig(config)}
        />
      ) : null,
    );
  }

  hideUI(): void {
    this.isOpen = false;
    this.render();
  }

  showUI(): void {
    this.isOpen = true;
    this.render();
  }

  async saveConfig(config: UserConfig): Promise<void> {
    await window.chrome.storage.local.set({ configJSON: config });
    this.core.updateConfig(config);
    log.info("Config saved");
  }
}
