// core.js
import { InputManager } from './inputs/input-manager.js';
import { StrategyFactory } from './strategies/factory.js';
import { buildTrieFromConfig } from './lib/trie.js'; // Utility to load config

class ExtensionCore {
  constructor(userConfig) {
    // 1. Setup Strategy (YouTube vs Amazon)
    this.strategy = StrategyFactory.getStrategy(window.location.hostname);
    
    // 2. Setup Data (Build Trie from User JSON)
    const trie = buildTrieFromConfig(userConfig);
    
    // 3. Setup Input Manager (The Listener)
    // We pass 'this' so the manager can call execute() or isInputAllowed()
    this.inputManager = new InputManager(this, trie);
    
    // 4. Command Registry
    this.commands = {
      'focus_search': () => this.strategy.focusSearch(),
      'next_item': () => this.strategy.navigateList(1),
      // ...
    };
  }

  // Helper for InputManager to check safety
  isInputAllowed(targetElement) {
    // If we are in 'Insert Mode', return true
    if (this.currentMode === 'insert') return true;
    
    // Standard DOM check
    const isField = targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA';
    const isContentEditable = targetElement.isContentEditable;
    return isField || isContentEditable;
  }

  execute(commandId) {
    const commandFn = this.commands[commandId];
    if (commandFn) commandFn();
    else console.log("command not found");
  }
}

new ExtensionCore();