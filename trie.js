/** ===========================================================================
 * MODULE 3: THE TRIE DATA STRUCTURE
 * ============================================================================ */
export class KeyTrie {
  constructor(keymap) {
    this.root = { children: {} };
    this.build(keymap);
  }

  build(keymap) {
    for (const [keySequence, commandId] of Object.entries(keymap)) {
      const keystrokes = keySequence.split(" "); // "g h" -> ["g", "h"]
      let currentNode = this.root;

      for (const key of keystrokes) {
        if (!currentNode.children[key]) {
          currentNode.children[key] = { children: {} };
        }
        currentNode = currentNode.children[key];
      }
      currentNode.command = commandId; // adds the command id to the last key of the sequence in the trie
    }
  }

  search(buffer) {
    let node = this.root;
    for (const key of buffer) {
      if (!node.children[key]) return { match: false, command: null };
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
