// inputs/input-manager.js
import { normalizeKey } from '../lib/key-utils.js';

export class InputManager {
  constructor(core, trie) {
    this.core = core;       // Reference to ExtensionCore to execute commands
    this.trie = trie;       // The data structure holding the keymap
    this.buffer = [];       // Stores sequences like ['g', 'i']
    this.bufferTimer = null;
    
    // Bind the listener ensuring 'this' context is preserved
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    // SETTING UP THE LISTENER
    // Use Capture Phase (true) to intercept before the website does
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  handleKeyDown(event) {
    // 1. IGNORE CHECKS
    // If the core says we are in 'InsertMode', or user is in an input field
    if (this.core.isInputAllowed(event.target)) {
      return; // Let the browser/website handle it
    }

    // 2. NORMALIZE
    const keyString = normalizeKey(event); // e.g., "g" or "ctrl+k"

    // 3. UPDATE BUFFER
    this.buffer.push(keyString);

    // 4. RESOLVE (Check the Trie)
    const result = this.trie.search(this.buffer);

    // --- Scenario A: No Match ---
    if (!result.match) {
      // If user typed 'z' and 'z' isn't in our map, clear buffer.
      // But if buffer was ['g', 'z'], maybe 'g' was valid but 'z' broke it.
      this.resetBuffer();
      return; // Allow default browser behavior
    }

    // TODO: Why?? isnt it 
    // --- Scenario B: Valid Match or Prefix ---
    // If we are here, the user is typing a valid shortcut.
    // We MUST prevent the website from seeing this key.
    event.preventDefault();
    event.stopPropagation();

    if (result.command) {
      // FULL MATCH (e.g., "ctrl+k" or sequence "g" then "i")
      this.core.execute(result.command);
      this.resetBuffer();
    } else if (result.isPrefix) {
      // PARTIAL MATCH (e.g., user typed "g", we are waiting for "g" or "i")
      this.setBufferTimeout();
    }
  }

  resetBuffer() {
    this.buffer = [];
    clearTimeout(this.bufferTimer);
  }

  setBufferTimeout() {
    clearTimeout(this.bufferTimer);
    // If user doesn't finish the sequence in 1s, clear it
    this.bufferTimer = setTimeout(() => this.resetBuffer(), 1000);
  }
}