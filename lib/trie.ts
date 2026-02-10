import "types.ts"

class Trie {
    private root: TrieRootNode;

    constructor() {
        this.root = new TrieRootNode();
    }

    public search(buffer: Array<Key>): CommandCode {
        return CommandCode["cmd+a B"];
    }

    
}

class TrieRootNode {
    protected children: Map<CommandCode,TrieNode>;

    constructor() {
        this.children = new Map();
    }

    addChild(childNode: TrieNode) {
        this.children.set(childNode.command, childNode);
    }
}

class TrieNode extends TrieRootNode {
    public parent: TrieNode;
    public command: CommandCode;

    constructor(parent: TrieNode, command: CommandCode) {
        super();
        this.parent = parent;
        this.command = command;
    }
}

function buildTrieFromConfig(config: JSON): Trie {
    let trie = new Trie();

    // parse config into a trie;
    // First check the global branch

    // then go through the specific branch and make any changes to commands as needed.

    return trie;
}