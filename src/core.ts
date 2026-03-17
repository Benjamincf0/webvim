import { generateEffectiveKeymap, isUserTyping, log } from "./utils.js";
import { StrategyFactory } from "./strategy.js";
import { UIManager } from "./uimanager.js";
import { KeyTrie } from "./trie.js";
import { InputManager } from "./InputManager.js";
import type { Mode, UserConfig, CommandId } from "./types.js";

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
  private strategy!: ReturnType<typeof StrategyFactory.get>;

  constructor(config: UserConfig, hostname: string) {
    this.config = config;
    this.hostname = hostname;
    this.mainItems = [];
    this.mainItemsIndex = 0;
    this.mainMenuItems = [];
    this.mainMenuItemsIndex = 0;

    this.UIManager = new UIManager(this as unknown as import("./types.js").ExtensionCore);
    this.UIManager.initUI();

    this.currentMode = "NAV_MODE";
    this.inputManager = new InputManager(this as unknown as import("./types.js").ExtensionCore, null);
    this.setMode(this.currentMode);

    document.addEventListener("DOMContentLoaded", () => {
      this.strategy = StrategyFactory.get(this as unknown as import("./types.js").ExtensionCore, hostname);
    });

    document.addEventListener("focusin", () => {
      if (isUserTyping(document.activeElement)) {
        this.setMode("INSERT_MODE");
        this.strategy.setInsertMode();
      }
    });
  }

  setMode(mode: Mode): void {
    this.currentMode = mode;
    this.updateConfig(this.config);
  }

  updateConfig(newConfig: UserConfig): void {
    this.config = newConfig;
    const newEffectiveKeymap = generateEffectiveKeymap(
      newConfig,
      this.hostname,
      this.currentMode,
    );
    const newTrie = new KeyTrie(newEffectiveKeymap);
    this.inputManager.trie = newTrie;
  }

  executeCommand(commandId: CommandId): boolean | undefined {
    switch (commandId) {
      case "open_extension_config":
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
        const event = new KeyboardEvent("keydown", {
          key: "ArrowDown",
          code: "ArrowDown",
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
        break;
      }
      case "arrow_up": {
        const event = new KeyboardEvent("keydown", {
          key: "ArrowUp",
          code: "ArrowUp",
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
        break;
      }
      default:
        log.warn(`Command ${commandId} not recognized.`);
    }
    return true;
  }
}
