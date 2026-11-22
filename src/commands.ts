import type { CommandId, Mode } from "./types.ts";

/** ===========================================================================
 * COMMAND & MODE METADATA (labels shown in the shortcuts menu)
 * ============================================================================ */

export type CommandGroup = "Modes" | "Navigation" | "Cursor & editing" | "Keys";

export interface CommandInfo {
  label: string;
  group: CommandGroup;
}

// Record<CommandId, ...> makes the compiler flag any command missing a label
export const commandInfo: Record<CommandId, CommandInfo> = {
  open_extension_config: { label: "Open this menu", group: "Modes" },
  set_NAV_MODE: { label: "Switch to Nav mode", group: "Modes" },
  set_NORMAL_MODE: { label: "Switch to Normal mode", group: "Modes" },
  set_INSERT_MODE: { label: "Switch to Insert mode", group: "Modes" },
  set_VISUAL_LINE_MODE: { label: "Switch to Visual line mode", group: "Modes" },
  set_VISUAL_CHAR_MODE: { label: "Switch to Visual char mode", group: "Modes" },
  scroll_down: { label: "Scroll down", group: "Navigation" },
  scroll_up: { label: "Scroll up", group: "Navigation" },
  go_home: { label: "Go to home page", group: "Navigation" },
  go_down: { label: "Next item", group: "Navigation" },
  go_up: { label: "Previous item", group: "Navigation" },
  menu_down: { label: "Next menu item", group: "Navigation" },
  menu_up: { label: "Previous menu item", group: "Navigation" },
  open_link: { label: "Open focused link", group: "Navigation" },
  open_link_in_new_tab: { label: "Open focused link in new tab", group: "Navigation" },
  focus_search: { label: "Focus search box", group: "Navigation" },
  move_cursor_down: { label: "Move cursor down", group: "Cursor & editing" },
  move_cursor_up: { label: "Move cursor up", group: "Cursor & editing" },
  move_cursor_left_by_one: { label: "Move cursor left", group: "Cursor & editing" },
  move_cursor_right_by_one: { label: "Move cursor right", group: "Cursor & editing" },
  moveCursorDownByN: { label: "Move cursor down N lines", group: "Cursor & editing" },
  moveCursorUpByN: { label: "Move cursor up N lines", group: "Cursor & editing" },
  delete_char: { label: "Delete character", group: "Cursor & editing" },
  delete_line: { label: "Delete line", group: "Cursor & editing" },
  arrow_down: { label: "Press ↓", group: "Keys" },
  arrow_up: { label: "Press ↑", group: "Keys" },
};

export const commandGroups: CommandGroup[] = ["Modes", "Navigation", "Cursor & editing", "Keys"];

export const modes: Mode[] = ["NAV_MODE", "NORMAL_MODE", "INSERT_MODE", "VISUAL_LINE_MODE", "VISUAL_CHAR_MODE"];

export const modeLabels: Record<Mode, string> = {
  NAV_MODE: "Nav",
  NORMAL_MODE: "Normal",
  INSERT_MODE: "Insert",
  VISUAL_LINE_MODE: "Visual line",
  VISUAL_CHAR_MODE: "Visual char",
};
