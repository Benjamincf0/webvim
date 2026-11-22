import {
  triggerKeyDown,
  generateEffectiveKeymap,
  isUserTyping,
  log,
  matchSite,
} from "./utils.ts";

import { StrategyFactory } from "./strategy.js";
import { UIManager } from "./uimanager.tsx";
import { KeyTrie } from "./trie.js";
import { InputManager } from "./InputManager.js";
import type { Mode, UserConfig, CommandId, ShortcutSettings } from "./types.ts";

export class ExtensionCore {
  config: UserConfig;
  hostname: string;
  currentMode: Mode;
  UIManager: UIManager;
  inputManager: InputManager;
  mainItems: HTMLElement[];
  mainItemsIndex: number;
  mainMenuItems: HTMLElement[];
  mainMenuItemsIndex: number;
  enabled: boolean;
  disabledShortcuts: Set<string>;
  disabledSites: Set<string>;
  private strategy!: ReturnType<typeof StrategyFactory.get>;

  constructor(config: UserConfig, hostname: string, enabled: boolean, settings: ShortcutSettings) {
    this.config = config;
    this.hostname = hostname;
    this.enabled = enabled;
    this.disabledShortcuts = new Set(settings.disabledShortcuts);
    this.disabledSites = new Set(settings.disabledSites);
    this.mainItems = [];
    this.mainItemsIndex = 0;
    this.mainMenuItems = [];
    this.mainMenuItemsIndex = 0;

    this.UIManager = new UIManager(this);
    this.UIManager.initUI();

    this.currentMode = "NAV_MODE";
    this.inputManager = new InputManager(this, null);
    this.setMode(this.currentMode);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initStrategy());
    } else {
      this.initStrategy();
    }

    document.addEventListener("focusin", () => {
      if (!this.isActive()) return;
      if (isUserTyping(document.activeElement)) {
        this.setMode("INSERT_MODE");
        this.strategy.setInsertMode();
      }
    });
  }

  // Off when shortcuts are switched off everywhere, or just on this site
  isActive(): boolean {
    if (!this.enabled) return false;
    const site = matchSite(Object.keys(this.config), this.hostname);
    return !(site && this.disabledSites.has(site));
  }

  // Strategies touch the page on creation (e.g. highlighting items), so skip them while disabled
  initStrategy(): void {
    if (this.strategy || !this.isActive()) return;
    this.strategy = StrategyFactory.get(this, this.hostname);
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    this.currentMode = "NAV_MODE";
    this.updateConfig(this.config);
    if (document.readyState !== "loading") this.initStrategy();
    await window.chrome.storage.local.set({ enabled });
  }

  applySettings(config: UserConfig, settings: ShortcutSettings): void {
    this.disabledShortcuts = new Set(settings.disabledShortcuts);
    this.disabledSites = new Set(settings.disabledSites);
    this.currentMode = "NAV_MODE";
    this.updateConfig(config);
    if (document.readyState !== "loading") this.initStrategy();
  }

  setMode(mode: Mode): void {
    this.currentMode = mode;
    this.updateConfig(this.config);
  }

  updateConfig(newConfig: UserConfig): void {
    this.config = newConfig;
    let keymap = generateEffectiveKeymap(newConfig, this.hostname, this.currentMode, this.disabledShortcuts);

    // While disabled, only the shortcut that opens the modal stays active (from any mode)
    if (!this.isActive()) {
      const navKeymap = generateEffectiveKeymap(newConfig, this.hostname, "NAV_MODE", this.disabledShortcuts);
      keymap = Object.fromEntries(
        Object.entries(navKeymap).filter(([, cmd]) => cmd === "open_extension_config"),
      );
    }

    this.inputManager.trie = new KeyTrie(keymap);
  }

  executeCommand(commandId: CommandId, event: Event): void {
    switch (commandId) {
      case "open_extension_config":
        // Swallow the key so it isn't typed into the editor that's about to get focus
        event.preventDefault();
        event.stopPropagation();
        this.UIManager.showUI();
        break;
      case "set_NORMAL_MODE":
        this.setMode("NORMAL_MODE");
        this.strategy.setNormalMode();
        break;
      case "scroll_down":
        window.scrollBy({ top: 400, behavior: "smooth" });
        break;
      case "scroll_up":
        window.scrollBy({ top: -400, behavior: "smooth" });
        break;
      case "go_home":
        this.strategy.goHome();
        break;
      case "menu_up":
        this.strategy.menuUp();
        break;
      case "menu_down":
        this.strategy.menuDown();
        break;
      case "go_up":
        if (this.mainItemsIndex > 0) {
          this.strategy.focusMainItem(this.mainItemsIndex - 1);
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        break;
      case "go_down":
        if (this.mainItemsIndex < this.mainItems.length - 1) {
          this.strategy.focusMainItem(this.mainItemsIndex + 1);
        } else {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        }
        break;
      case "open_link":
        this.strategy.openLink();
        break;
      case "open_link_in_new_tab":
        this.strategy.openLinkInNewTab();
        break;
      case "focus_search":
        this.strategy.focusSearch();
        break;
      case "set_NAV_MODE":
        this.setMode("NAV_MODE");
        this.strategy.setNavMode();
        break;
      case "set_INSERT_MODE":
        this.setMode("INSERT_MODE");
        this.strategy.setInsertMode();
        break;
      case "set_VISUAL_LINE_MODE":
        this.setMode("VISUAL_LINE_MODE");
        this.strategy.setVisualLineMode();
        event.preventDefault();
        event.stopPropagation();
        log.info("shouldve selected text");
        break;
      case "set_VISUAL_CHAR_MODE":
        this.setMode("VISUAL_LINE_MODE");
        this.strategy.setVisualCharMode();
        break;
      case "move_cursor_down":
        this.strategy.moveCursorDown();
        break;
      case "move_cursor_up":
        this.strategy.moveCursorUp();
        break;
      case "delete_char":
        this.strategy.deleteChar();
        break;
      case "arrow_down": {
        log.info("arrow_down");
        triggerKeyDown("ArrowDown", 40);
        event.preventDefault();
        event.stopPropagation();
        break;
      }
      case "arrow_up": {
        triggerKeyDown("ArrowUp", 38);
        event.preventDefault();
        event.stopPropagation();
        break;
      }
      default:
        log.warn(`Command ${commandId} not recognized.`);
    }
  }
}
