import type { TrieNode, TrieSearchResult, KeymapConfig } from "./types.js";

export class KeyTrie {
  root: TrieNode;
  constructor(keymap: KeymapConfig) {
    this.root = { children: {} };
    this.build(keymap);
  }

  build(keymap: KeymapConfig): void {
    for (const [keySequence, commandId] of Object.entries(keymap)) {
      const keystrokes = keySequence.split(" ");
      let currentNode = this.root;

      for (const key of keystrokes) {
        if (!currentNode.children[key]) {
          currentNode.children[key] = { children: {} };
        }
        currentNode = currentNode.children[key];
      }
      currentNode.command = commandId;
    }
  }

  search(buffer: string[]): TrieSearchResult {
    let node: TrieNode = this.root;
    for (const key of buffer) {
      if (!node.children[key]) {
        return { match: false, command: null, isPrefix: false };
      }
      node = node.children[key];
    }

    const hasChildren = Object.keys(node.children).length > 0;
    return {
      match: true,
      command: node.command || null,
      isPrefix: hasChildren,
    };
  }
}
