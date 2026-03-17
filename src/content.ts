import { ExtensionCore } from "./core.js";
import type { UserConfig } from "./types.js";

const USER_CONFIG: UserConfig = {
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
      "ctrl+n": "arrow_up",
      "ctrl+p": "arrow_down",
    },
    VISUAL_LINE_MODE: {
      escape: "set_NORMAL_MODE",
    },
    VISUAL_CHAR_MODE: {
      escape: "set_NORMAL_MODE",
    },
  },
  "youtube.com": {
    NAV_MODE: {},
    NORMAL_MODE: {},
    INSERT_MODE: {},
    VISUAL_LINE_MODE: {},
    VISUAL_CHAR_MODE: {},
  },
  "google.com": {
    NAV_MODE: {
      "mod+enter": "open_link",
      "mod+shift+enter": "open_link_in_new_tab",
    },
    NORMAL_MODE: {},
    INSERT_MODE: {},
    VISUAL_LINE_MODE: {},
    VISUAL_CHAR_MODE: {},
  },
};

async function main(): Promise<void> {
  const result = await window.chrome.storage.local.get("configJSON");
  const configJSON = result.configJSON as UserConfig | undefined;
  console.log("Applying config:", configJSON);
  new ExtensionCore(configJSON || USER_CONFIG, window.location.hostname);
}

main();
