import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { log, waitFor } from "./utils.js";
import { ConfigModal } from "./ConfigModal.tsx";
import { ExtensionCore } from "./core.ts";
import type { ShortcutSettings, UserConfig } from "./types.ts";
import styles from "./index.css?inline";

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
          settings={{
            disabledShortcuts: [...this.core.disabledShortcuts],
            disabledSites: [...this.core.disabledSites],
          }}
          hostname={this.core.hostname}
          enabled={this.core.enabled}
          onToggleEnabled={(enabled) => this.core.setEnabled(enabled)}
          onClose={() => this.hideUI()}
          onSave={(config, settings) => this.saveConfig(config, settings)}
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

  async saveConfig(config: UserConfig, settings: ShortcutSettings): Promise<void> {
    await window.chrome.storage.local.set({ configJSON: config, ...settings });
    this.core.applySettings(config, settings);
    log.info("Config saved");
  }
}
