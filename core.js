import { generateEffectiveKeymap } from "./utils.js";
import { StrategyFactory } from "./strategy.js";
import { UIManager } from "./uimanager.js";
import { KeyTrie } from "./trie.js";
import { InputManager } from "./InputManager.js";
/** ===========================================================================
 * MODULE 5: THE CORE (Command Registry)
 * ============================================================================ */
export class ExtensionCore {
  constructor(config, hostname) {
    this.config = config;
    this.hostname = hostname;

    this.UIManager = new UIManager(this);
    this.UIManager.initUI();

    this.currentMode = "NAV_MODE";
    this.inputManager = new InputManager(this, null);
    this.setMode(this.currentMode);

    document.addEventListener("DOMContentLoaded", () => {
      this.strategy = StrategyFactory.get(this, hostname);
    });

    // TODO: Maybe use methods to get page data necessary for actions
    //  from strategy and execute here, to keep strategies stateless.
    // i.e get list of main items for i/j/k/l
  }

  setMode(mode) {
    this.currentMode = mode;
    this.updateConfig(this.config);
  }

  updateConfig(newConfig) {
    this.config = newConfig;
    const newEffectiveKeymap = generateEffectiveKeymap(
      newConfig,
      this.hostname,
      this.currentMode,
    );
    const newTrie = new KeyTrie(newEffectiveKeymap);
    this.inputManager.trie = newTrie;
  }

  executeCommand(commandId) {
    // calls delagate
    switch (commandId) {
      // NAV_MODE
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
        this.strategy.goUp();
        break;
      case "go_down":
        this.strategy.goDown();
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

      // NORMAL_MODE
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
      case "x":
        this.strategy.deleteChar();
        break;

      // Other modes
      // case "set_NORMAL_MODE":
      //   this.setMode("NORMAL_MODE");
      //   this.strategy.setNormalMode();
      //   break;

      default:
        log.warn(`Command ${commandId} not recognized.`);
    }
  }
}
