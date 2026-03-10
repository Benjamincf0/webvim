import { ExtensionCore } from "./core.js";
/** ===========================================================================
 * MODULE 1: CONFIGURATION
 * This represents what would eventually come from chrome.storage
 * ============================================================================ */
const USER_CONFIG = {
  global: {
    NAV_MODE: {
      "mod+shift+e o": "open_extension_config",
      "mod+shift+e n": "set_NORMAL_MODE",
      "shift+j": "scroll_down",
      "shift+k": "scroll_up",
      "ctrl+g h": "go_home",
      "ctrl+n": "menu_down",
      "ctrl+p": "menu_up",
      j: "go_down",
      k: "go_up",
    },
    // "EDITABLE_MODE": {
    NORMAL_MODE: {
      escape: "set_NAV_MODE",
      i: "set_INSERT_MODE",
      "shift+v": "set_VISUAL_LINE_MODE",
      v: "set_VISUAL_CHAR_MODE",
      j: "move_cursor_down",
      k: "move_cursor_up",
      l: "move_cursor_right_by_one",
      h: "move_cursor_left_by_one",
      "<number>j": "moveCursorDownByN",
      "<number>k": "moveCursorUpByN",
      x: "delete_char",
      "d d": "delete_line",
    },
    INSERT_MODE: {
      escape: "set_NORMAL_MODE",
    },
    VISUAL_LINE_MODE: {
      escape: "set_NORMAL_MODE",
    },
    VISUAL_CHAR_MODE: {
      escape: "set_NORMAL_MODE",
    },
    // }
  },
  "youtube.com": {
    // "mod+k": "focus_search",
  },
  "google.com": {
    NAV_MODE: {
      // "mod+k": "focus_search",
      "mod+enter": "open_link",
      "mod+shift+enter": "open_link_in_new_tab",
    },
    NORMAL_MODE: {},
  },
};

/** ===========================================================================
 * INIT
 * ============================================================================ */
// Start the extension
async function main() {
  const result = await chrome.storage.local.get({ configJSON: USER_CONFIG });
  console.log("Applying config:", result.configJSON);
  new ExtensionCore(result.configJSON, window.location.hostname);
}

main();
