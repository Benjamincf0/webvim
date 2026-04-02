import { normalizeKey, log } from "./utils.js";
import { ExtensionCore } from "./core.ts";
import { KeyTrie } from "./trie.js";

export class InputManager {
  core: ExtensionCore;
  trie: KeyTrie | null;
  buffer: string[];
  timer: ReturnType<typeof setTimeout> | null;
  boundHandleKeyDown: (event: KeyboardEvent) => void;

  constructor(core: ExtensionCore, trie: KeyTrie | null) {
    this.core = core;
    this.trie = trie;
    this.buffer = [];
    this.timer = null;

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener("keydown", this.boundHandleKeyDown, true);
  }

  handleKeyDown(event: KeyboardEvent): void {
    const keyString = normalizeKey(event);
    log.info(keyString);
    if (!keyString) return;

    if (!this.trie) return;

    this.buffer.push(keyString);
    const result = this.trie.search(this.buffer);

    if (!result.match) {
      this.resetBuffer();
      return;
    }

    if (result.command) {
      this.core.executeCommand(result.command, event);
      // if (commandResult === true) {
      //   event.preventDefault();
      //   event.stopPropagation();
      // }
      this.resetBuffer();
    } else if (result.isPrefix) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.resetBuffer(), 2000);
    }
  }

  resetBuffer(): void {
    this.buffer = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
