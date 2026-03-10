import { normalizeKey, log } from "./utils.js";
/** ===========================================================================
 * MODULE 6: INPUT MANAGER
 * ============================================================================ */
export class InputManager {
  constructor(core, trie) {
    this.core = core;
    this.trie = trie;
    this.buffer = [];
    this.timer = null;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    // Use capture phase to intercept keys before the website does
    document.addEventListener("keydown", this.handleKeyDown, true);
  }

  handleKeyDown(event) {
    // 2. Normalize and update buffer
    const keyString = normalizeKey(event);
    log.info(keyString);
    // Ignore stray modifier keys
    if (!keyString) return;

    this.buffer.push(keyString);

    // 3. Search the Trie
    const result = this.trie.search(this.buffer);

    // Scenario A: Invalid sequence
    if (!result.match) {
      this.resetBuffer();
      return; // Let browser handle normal keys
    }

    // Scenario B: Valid sequence or prefix found! Intercept the key.

    if (result.command) {
      // Complete command found
      if (this.core.executeCommand(result.command) == true) {
        // stop propagation if success
        event.preventDefault();
        event.stopPropagation();
      }

      this.resetBuffer();
    } else if (result.isPrefix) {
      // Waiting for next key in sequence (e.g., pressed 'g', waiting for 'h')
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.resetBuffer(), 2000);
    }
  }

  resetBuffer() {
    this.buffer = [];
    clearTimeout(this.timer);
  }
}
