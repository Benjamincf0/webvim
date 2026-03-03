const waitFor=(s,c,o=new MutationObserver(()=>{const e=document.querySelector(s);if(e){o.disconnect();c(e)}}))=>(o.observe(document.body,{childList:!0,subtree:!0}),o);
const SHORTCUT_MODE = 1
const EDIT_MODE = 2
const EDIT_MODE_VIM = 3


/** ===========================================================================
 * MODULE 1: CONFIGURATION
 * This represents what would eventually come from chrome.storage
 * ============================================================================ */
const USER_CONFIG = {
  "global": {
    "NAV_MODE": {
      "shift+j": "scroll_down",
      "shift+k": "scroll_up",
      "escape": "shortcut_mode",
      "ctrl+v i m": "edit_mode_vim",
      "ctrl+g h": "go_home",
      "ctrl+n": "menu_down",
      "ctrl+p": "menu_up",
      "j": "go_down",
      "k": "go_up",
    },
    // "EDITABLE_MODE": {
    "NORMAL_MODE": {
      "escape": "set_NAV_MODE",
      "i": "set_INSERT_MODE",
      "j": "move_cursor_down",
      "k": "move_cursor_up",
      "l": "move_cursor_right_by_one",
      "h": "move_cursor_left_by_one",
      "<number>j": "moveCursorDownByN",
      "<number>k": "moveCursorUpByN",
      "V": "set_VISUAL_LINE_MODE",
      "v": "set_VISUAL_CHAR_MODE",
      "x": "delete_char",
      "d d": "delete_line",
    },
    "INSERT_MODE": {
      "escape": "set_NORMAL_MODE",
    },
    "VISUAL_LINE_MODE": {
      "escape": "set_NORMAL_MODE",
    },
    "VISUAL_CHAR_MODE": {
      "escape": "set_NORMAL_MODE",
    }
    // }
  },
  "youtube.com": {
    "mod+k": "focus_search",
     // Example of a chord/sequence
  },
  "google.com": {
    "mod+k": "focus_search",
    "mod+enter": "open",
    "mod+shift+enter": "open_in_new_tab",
  }
};

/** ===========================================================================
 * MODULE 2: KEY UTILITIES & RESOLVER
 * ============================================================================ */
function normalizeKey(event) {
  const parts = [];
  
  // Use 'mod' to map to Cmd on Mac and Ctrl on Windows
  const isMac = navigator.userAgent.includes("Mac");
  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  
  if (modPressed) parts.push("mod");  // If we aren't using the OS specific mod key, check standard ctrl/meta
  else if (event.ctrlKey) parts.push("ctrl");
  else if (event.metaKey) parts.push("meta");
  
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  // Filter out standalone modifier key presses
  const key = event.key.toLowerCase();
  if (!["control", "alt", "meta", "shift"].includes(key)) {
    parts.push(key);
  }

  return parts.join("+");
}

function generateEffectiveKeymap(config, hostname, currentMode) {
  let effectiveMap = { ...config["global"][currentMode] };
  const siteKey = Object.keys(config).find((site) => hostname.includes(site));

  if (siteKey) {
    effectiveMap = { ...effectiveMap, ...config[siteKey][currentMode] };
  }
  return effectiveMap;
}

/** ===========================================================================
 * MODULE 3: THE TRIE DATA STRUCTURE
 * ============================================================================ */
class KeyTrie {
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
      isPrefix: hasChildren
    };
  }
}

function isUserTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const nonTyping = ['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image'];
    return !nonTyping.includes(el.type);
  }
  return el.isContentEditable;
}
/** ===========================================================================
 * MODULE 4: STRATEGIES (The DOM Adapters)
 * ============================================================================ */
class BaseStrategy {
  constructor() {
    this._MODE;

    document.addEventListener('focusin', (event) => {
        console.log('Focus moved to:', event.target);
        if (isUserTyping(document.activeElement)) {
          console.log('Current active element:', document.activeElement);
          this.setMode(EDIT_MODE);
        }
    });

    const inject = () => {
      this.box = document.createElement('div');
      this.box.innerHTML = '<p style="margin: 0">N</p>';
      Object.assign(this.box.style, {
        position: 'fixed',
        top: '0px',
        right: '0px',
        zIndex: '2147483647',
        background: '#000000',
        color: '#ffffff',
        padding: '2px 2px',
        borderRadius: '0px',
        font: '15px sans-serif'
      });
      document.body.appendChild(this.box);
    };

    inject();

    this.menuIndex = 0;
    this.menuItems = [];
  }

  menuDown() {
    if (this._MODE == EDIT_MODE) return false;
    this.menuItems[++this.menuIndex].click();
    return true;
  }

  menuUp() {
    if (this._MODE == SHORTCUT_MODE) return false;
    console.log(this.menuItems[this.menuIndex-1]);
    this.menuItems[--this.menuIndex].click();
    return true;
  }

  goUp() {
    if (this._MODE == EDIT_MODE) return false;
    console.log("Base Up")
    return true;
  }

  goDown() {
    if (this._MODE == EDIT_MODE) return false;
    console.log("Base Down")
    return true;
  }

  setMode(mode) {
    switch (mode) {
      case SHORTCUT_MODE:
        // We wrap the blur in a timeout so it defers and runs after default and propagation.
        setTimeout(() => {document.activeElement.blur()}, 0);
        this._MODE = SHORTCUT_MODE
        return false;
      case EDIT_MODE:
        this._MODE = EDIT_MODE;
        break;
      default:
        break;
    }
  }

  focusSearch() { console.log("Search not configured for this site"); }

  goHome() {
    window.location.href = "/";
    console.log("Go home bitch")
   }
}

class YouTubeStrategy extends BaseStrategy {
  // TODO:
  focusSearch() {
    const searchBox = document.querySelector('form[action="/results"] input[name="search_query"]');
    if (searchBox) searchBox.focus();
    console.log("SUCCESS")
  }
}

class GoogleStrategy extends BaseStrategy {
  constructor() {
    super();

    waitFor("#search div[data-rpos]", el => {
      this.results = document.getElementById('search').querySelectorAll('[data-rpos]');
      this.results.forEach((el) => {el.querySelector("div").style.padding = "10px"})
      this.searchIndex = 0;
      this.focusResult(0);
    });

    waitFor("div[role='listitem'] a[href^='/search?']", el => {
      this.menuItems = document.querySelectorAll("div[role='listitem'] a[href^='/search?']");
      const currentMenuItem = document.querySelector("div[role='listitem'] a[aria-disabled='true']");
      const num = [...this.menuItems].indexOf(currentMenuItem);
      console.log("THE NUM IS " + num + this.menuItems + currentMenuItem);
      this.menuIndex = num;
      // this.menuItems[this.menuIndex].click();
    });
  }

  menuDown() {
    super.menuDown()
  }

  menuUp() {
    super.menuUp()
  }

  goUp() {
    if (this._MODE == EDIT_MODE) return false;
    this.focusResult(Math.max(this.searchIndex - 1, 0))
    console.log("going up")
    return true;
  }

  goDown() {
    if (this._MODE == EDIT_MODE) return false;
    this.focusResult(Math.min(this.searchIndex + 1, this.results.length - 1))
    console.log("going down")
    return true;
  }

  enter() {
    let current = this.results[this.searchIndex];
    let inner_link = current.querySelector('span a');
    inner_link.click();
  }

  focusResult(i) {
    let prev = this.results[this.searchIndex];
    let prevChild = prev.querySelector("div")
    let current = this.results[i];
    let child = current.querySelector("div")
    prevChild.style.border = "1px transparent";
    prevChild.style.backgroundColor = "transparent"
    prevChild.style.borderRadius = "none"

    child.style.border = "1px solid #6b2d5b";
    child.style.backgroundColor = "#e2d1e0"
    child.style.borderRadius = "10px"
    this.searchIndex = i;
    current.scrollIntoViewIfNeeded(true);
    current.focus();
  }

  focusSearch() {
    const searchBox = document.querySelector('form[action="/search"] textarea[aria-label="Search"]');
    if (searchBox) searchBox.focus();
  }
}

class FacebookMessages extends BaseStrategy {
  constructor() {
    super();

	  waitFor("div[aria-label='Chats'] a[href^='/messages/']", el => {
      this.menuItems = document.querySelectorAll("div[aria-label='Chats'] a[href^='/messages/']");
      console.log(this.menuItems);
      this.menuItems[this.menuIndex].click();
    });


  }
    menuDown() {
      super.menuDown()
      this.menuItems[this.menuIndex].scrollIntoViewIfNeeded(true);
    }

    menuUp() {
      super.menuUp()
      this.menuItems[this.menuIndex].scrollIntoViewIfNeeded(true);
    }
}

class StrategyFactory {
  static get(hostname) {
    if (hostname.includes("youtube.com")) return new YouTubeStrategy();
    if (hostname.includes("google.com")) return new GoogleStrategy();
    if (hostname.includes("facebook.com")) return new FacebookMessages();
    return new BaseStrategy();
  }
}

/** ===========================================================================
 * MODULE 5: THE CORE (Command Registry)
 * ============================================================================ */
class ExtensionCore {
  constructor(config) {
    const hostname = window.location.hostname;
    this.currentMode = "NAV_MODE";

    document.addEventListener('DOMContentLoaded', () => {this.strategy = StrategyFactory.get(hostname);});
    
    const effectiveKeymap = generateEffectiveKeymap(config, hostname, this.currentMode);
    const trie = new KeyTrie(effectiveKeymap);
    
    this.inputManager = new InputManager(this, trie);
  }

  executeCommand(commandId) { // calls delagate
    switch (commandId) {
      case "focus_search":
        return this.strategy.focusSearch();
      case "scroll_down":
        return window.scrollBy({ top: 400, behavior: 'smooth' });
      case "scroll_up":
        return window.scrollBy({ top: -400, behavior: 'smooth' });
      case "shortcut_mode":
        return this.strategy.setMode(SHORTCUT_MODE);
      case "go_home":
        return this.strategy.goHome();
      case "go_up":
        return this.strategy.goUp();
      case "go_down":
        return this.strategy.goDown();
      case "enter":
        return this.strategy.enter();
      case "menu_up":
        return this.strategy.menuUp();
      case "menu_down":
        return this.strategy.menuDown();
      default:
        console.warn(`Command ${commandId} not recognized.`);
    }
  }
}

/** ===========================================================================
 * MODULE 6: INPUT MANAGER
 * ============================================================================ */
class InputManager {
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
    console.log(keyString);
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
      if (this.core.executeCommand(result.command) == true) { // stop propagation if success
        event.preventDefault();
        event.stopPropagation();
      };

      this.resetBuffer();
    } else if (result.isPrefix) {
      // Waiting for next key in sequence (e.g., pressed 'g', waiting for 'h')
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.resetBuffer(), 1000);
    }
  }

  resetBuffer() {
    this.buffer = [];
    clearTimeout(this.timer);
  }
}

/** ===========================================================================
 * INIT
 * ============================================================================ */
// Start the extension
new ExtensionCore(USER_CONFIG);