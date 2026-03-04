const waitFor=(s,c,o=new MutationObserver(()=>{const e=document.querySelector(s);if(e){o.disconnect();c(e)}}))=>(o.observe(document.body,{childList:!0,subtree:!0}),o);

function waitForElement(selector) {
  return new Promise((resolve) => {
    // Check if it's already there before we even start watching
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  });
}

const log = {
  info: (...args) => console.log('[BetterWeb]', ...args),
  warn: (...args) => console.warn('[BetterWeb]', ...args),
  error: (...args) => console.error('[BetterWeb]', ...args),
};

// Usage
log.info('This is from my extension');

/** ===========================================================================
 * MODULE 1: CONFIGURATION
 * This represents what would eventually come from chrome.storage
 * ============================================================================ */
const USER_CONFIG = {
  "global": {
    "NAV_MODE": {
      "mod+shift+e o": "open_extension_config",
      "mod+shift+e n": "set_NORMAL_MODE",
      "shift+j": "scroll_down",
      "shift+k": "scroll_up",
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
      "shift+v": "set_VISUAL_LINE_MODE",
      "v": "set_VISUAL_CHAR_MODE",
      "j": "move_cursor_down",
      "k": "move_cursor_up",
      "l": "move_cursor_right_by_one",
      "h": "move_cursor_left_by_one",
      "<number>j": "moveCursorDownByN",
      "<number>k": "moveCursorUpByN",
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
    // "mod+k": "focus_search",
  },
  "google.com": {
    // "mod+k": "focus_search",
    "mod+enter": "open_link",
    "mod+shift+enter": "open_link_in_new_tab",
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
  log.info(effectiveMap);
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
    // this._MODE;

    // TODO: Move this to ExtensionCore to make strategies stateless. (call setNormalMode when editable element is focused)
    // document.addEventListener('focusin', (event) => {
    //     log.info('Focus moved to:', event.target);
    //     if (isUserTyping(document.activeElement)) {
    //       log.info('Current active element:', document.activeElement);
    //       this.setMode(EDIT_MODE);
    //     }
    // });

    this.menuIndex = 0;
    this.menuItems = [];
  }

  setNormalMode() {
    log.info("setNormalMode");
  }

  // NAV_MODE
  goHome() {
    window.location.href = "/";
    log.info("Go home bitch");
  }

  menuUp() {
    this.menuItems[--this.menuIndex].click();
  }

  menuDown() {
    this.menuItems[++this.menuIndex].click();
  }

  goUp() {
    log.info("goUp");
  }

  goDown() {
    log.info("goDown");
  }

  focusSearch() {
    log.info("focusSearch");
  }

  // NORMAL_MODE
  setNavMode() {
    log.info("setNavMode");
  }

  setInsertMode() {
    log.info("setInsertMode");
  }

  setVisualLineMode() {
    log.info("setVisualLineMode");
  }

  setVisualCharMode() {
    log.info("setVisualCharMode");
  }
}

class YouTubeStrategy extends BaseStrategy {
  // TODO:
  focusSearch() {
    const searchBox = document.querySelector('form[action="/results"] input[name="search_query"]');
    if (searchBox) searchBox.focus();
    log.info("SUCCESS")
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
      log.info("THE NUM IS " + num + this.menuItems + currentMenuItem);
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
    log.info("going up")
    return true;
  }

  goDown() {
    if (this._MODE == EDIT_MODE) return false;
    this.focusResult(Math.min(this.searchIndex + 1, this.results.length - 1))
    log.info("going down")
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
      log.info(this.menuItems);
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
    // if (hostname.includes("youtube.com")) return new YouTubeStrategy();
    // if (hostname.includes("google.com")) return new GoogleStrategy();
    // if (hostname.includes("facebook.com")) return new FacebookMessages();
    return new BaseStrategy();
  }
}


class UIManager {
  constructor(core) {
    this.core = core;
    // TODO: Create a UIManager class connected to ExtensionCore that handles UI
    //    - add a shortcut to show a small menu with a form
    //    - small form to edit config & save to browser storage
    //    - at the start, load file from storage to generate config json.
  }

  async initUI() {
    await waitForElement("body");

    this.box = document.createElement('div');
    // 1. Create Heading 1
    const h1 = document.createElement('h1');
    h1.textContent = "Web Shortcuts Extension";

    // 2. Create Heading 2
    const h2 = document.createElement('h2');
    h2.textContent = "Add your configurations here";

    // 3. Create Form and its children
    const form = document.createElement('form');

    this.textarea = document.createElement('textarea');
    this.textarea.id = "asdf";

    const button = document.createElement('button');
    button.type = "submit";
    button.textContent = "Submit"; // Buttons usually need label text
    button.addEventListener("click", (e) => {this.handleSubmitForm(e)})

    // 4. Assemble the form
    form.appendChild(this.textarea);
    form.appendChild(button);

    // 5. Add everything to your container (this.box)
    this.box.append(h1, h2, form);
    Object.assign(this.box.style, {
      // all: 'revert',
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: '2147483647',
      background: '#000000',
      color: '#ffffff',
      padding: '25px',
      borderRadius: '10px',
      width: '80vw',
      font: 'sans-serif'
    });

    Object.assign(this.textarea.style,{
      display: 'block',
      height: '150px',
      width: '100%'
    })

    Object.assign(button.style, {
      width: '100%',
      height: '45px',
    })
    
    this.host = document.createElement('div');
    this.hideUI();
    document.body.appendChild(this.host);
    const shadow = this.host.attachShadow({ mode: 'closed' });
    shadow.appendChild(this.box);

    document.body.addEventListener("click", (e) => {
      if (!this.host.contains(e.target)) {
        this.hideUI();
      }
    })
  }

  hideUI() {
    this.host.style.display = "none";
  }

  showUI() {
    this.textarea.value = JSON.stringify(this.core.config, null, '\t');
    this.host.style.display = "inline-block";
  }

  async handleSubmitForm(e) {
    e.preventDefault();
    log.info(e);

    // await new Promise((resolve) => setTimeout(resolve, 2000)); // wooo waiting lmao
    let configJSON = null;
    log.info(this.textarea.value);
    try {
      configJSON = JSON.parse(this.textarea.value);
    } catch (error) {
      log.error("JSON aint legit bruh "+error);
      return;
    }

    await chrome.storage.local.set({ 
      configJSON: configJSON,
    });
    log.info(`Data saved! : ${configJSON}`);

    this.core.updateConfig(configJSON);
  }
}

/** ===========================================================================
 * MODULE 5: THE CORE (Command Registry)
 * ============================================================================ */
class ExtensionCore {
  constructor(config, hostname) {
    this.config = config
    this.hostname = hostname;

    this.UIManager = new UIManager(this);
    this.UIManager.initUI();

    this.currentMode = "NAV_MODE";
    this.inputManager = new InputManager(this, null);
    this.setMode(this.currentMode);

    document.addEventListener('DOMContentLoaded', () => {this.strategy = StrategyFactory.get(hostname);});
    
    // TODO: Maybe use methods to get page data necessary for actions
    //  from strategy and execute here, to keep strategies stateless.
    // i.e get list of main items for i/j/k/l
  }

  setMode(mode) {
    this.currentMode = mode;
    this.updateConfig(this.config)
  }

  updateConfig(newConfig) {
    this.config = newConfig;
    const newEffectiveKeymap = generateEffectiveKeymap(newConfig, this.hostname, this.currentMode);
    const newTrie = new KeyTrie(newEffectiveKeymap);
    this.inputManager.trie = newTrie;
  }

  executeCommand(commandId) { // calls delagate
    switch (commandId) {
      // NAV_MODE
      case "open_extension_config":
        this.UIManager.showUI();
        break;
      case "set_NORMAL_MODE":
        this.setMode("NORMAL_MODE");
        this.strategy.setNormalMode();
        break;
      case "scroll_down":
        window.scrollBy({ top: 400, behavior: 'smooth' });
        break;
      case "scroll_up":
        window.scrollBy({ top: -400, behavior: 'smooth' });
        break;
      case "go_home":
        this.strategy.goHome();
        break;
      case "menu_up":
        this.strategy.menuUp();
        break;
      case "menu_down":
        this.strategy.menuDown();
        break;
      case "go_up":
        this.strategy.goUp();
        break;
      case "go_down":
        this.strategy.goDown();
        break;

      case "open_link":
        this.strategy.openLink();
        break;
      case "open_link_in_new_tab":
        this.strategy.openLinkInNewTab();
        break;
        
      case "focus_search":
        this.strategy.focusSearch();
        break;


      // NORMAL_MODE
      case "set_NAV_MODE":
        this.setMode("NAV_MODE");
        this.strategy.setNavMode();
        break;
      case "set_INSERT_MODE":
        this.setMode("INSERT_MODE");
        this.strategy.setInsertMode();
        break;
      case "set_VISUAL_LINE_MODE":
        this.setMode("VISUAL_LINE_MODE");
        this.strategy.setVisualLineMode();
        break;
      case "set_VISUAL_CHAR_MODE":
        this.setMode("VISUAL_LINE_MODE");
        this.strategy.setVisualCharMode();
        break;
      case "move_cursor_down":
        this.strategy.moveCursorDown();
        break;
      case "move_cursor_up":
        this.strategy.moveCursorUp();
        break;
      case "x":
        this.strategy.deleteChar();
        break;


      // Other modes
      case "set_NORMAL_MODE":
        this.setMode("NORMAL_MODE");
        this.strategy.setNormalMode();
        break;


      default:
        log.warn(`Command ${commandId} not recognized.`);
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
      if (this.core.executeCommand(result.command) == true) { // stop propagation if success
        event.preventDefault();
        event.stopPropagation();
      };

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

/** ===========================================================================
 * INIT
 * ============================================================================ */
// Start the extension
async function main() {
  const result = await chrome.storage.local.get({ configJSON: USER_CONFIG });
  console.log("Applying config:", result.configJSON);
  new ExtensionCore(result.configJSON, window.location.hostname);
}

main();