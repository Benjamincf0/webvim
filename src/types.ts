export type Mode =
  | "NAV_MODE"
  | "NORMAL_MODE"
  | "INSERT_MODE"
  | "VISUAL_LINE_MODE"
  | "VISUAL_CHAR_MODE";

export type CommandId =
  | "open_extension_config"
  | "set_NORMAL_MODE"
  | "set_NAV_MODE"
  | "set_INSERT_MODE"
  | "set_VISUAL_LINE_MODE"
  | "set_VISUAL_CHAR_MODE"
  | "scroll_down"
  | "scroll_up"
  | "go_home"
  | "menu_down"
  | "menu_up"
  | "go_down"
  | "go_up"
  | "moveCursorDownByN"
  | "moveCursorUpByN"
  | "move_cursor_down"
  | "move_cursor_up"
  | "move_cursor_right_by_one"
  | "move_cursor_left_by_one"
  | "open_link"
  | "open_link_in_new_tab"
  | "focus_search"
  | "delete_char"
  | "delete_line"
  | "arrow_down"
  | "arrow_up";

export type KeySequence = string;

export type KeymapConfig = Record<KeySequence, CommandId>;

export type SiteConfig = Record<Mode, KeymapConfig>;

export interface UserConfig {
  global: Record<Mode, KeymapConfig>;
  [hostname: string]: SiteConfig;
}

export interface TrieNode {
  children: Record<string, TrieNode>;
  command?: CommandId;
}

export interface TrieSearchResult {
  match: boolean;
  command: CommandId | null;
  isPrefix: boolean;
}

export interface ExtensionCore {
  config: UserConfig;
  hostname: string;
  currentMode: Mode;
  mainItems: HTMLElement[];
  mainItemsIndex: number;
  mainMenuItems: HTMLElement[];
  mainMenuItemsIndex: number;
  setMode(mode: Mode): void;
  updateConfig(newConfig: UserConfig): void;
  executeCommand(commandId: CommandId): boolean | undefined;
}

declare global {
  interface Window {
    chrome: {
      storage: {
        local: {
          get: (keys: string | string[]) => Promise<Record<string, unknown>>;
          set: (items: Record<string, unknown>) => Promise<void>;
        };
      };
    };
  }
}
