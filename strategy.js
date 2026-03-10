import { waitFor, log } from "./utils.js";
export class BaseStrategy {
  constructor(core) {
    this.core = core;

    // TODO: Move this to ExtensionCore to make strategies stateless. (call setNormalMode when editable element is focused)
    // document.addEventListener('focusin', (event) => {
    //     log.info('Focus moved to:', event.target);
    //     if (isUserTyping(document.activeElement)) {
    //       log.info('Current active element:', document.activeElement);
    //       this.setMode(EDIT_MODE);
    //     }
    // });
    //
    //
    // document.addEventListener("focusin", (e) => {
    //   if e.target:
    //   this.core.setInsertMode();
    // });
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

export class YouTubeStrategy extends BaseStrategy {
  constructor(core) {
    super(core);
    document.querySelectorAll("#contents yt-touch-feedback-shape");
    waitFor("#contents yt-touch-feedback-shape", (el) => {
      this.core.mainItems = document.querySelectorAll("#contents #content");
      log.info("test");
      log.info(this.core.mainItems);
      this.core.mainItemsIndex = 0;
      this.focusMainItem(0, undefined, false);
    });

    waitFor("#items", (el) => {
      this.core.mainMenuItems = document.querySelector("#items").children;
      log.info(this.core.mainMenuItems);
      this.core.mainMenuItemsIndex = 0;
    });
  }

  focusMainItem(i) {
    newItem = this.core.mainItems[i].querySelector("yt-touch-feedback-shape");
    newItem.classList.add("yt-spec-touch-feedback-shape--hovered");
  }

  focusSearch() {
    const searchBox = document.querySelector(
      'form[action="/results"] input[name="search_query"]',
    );
    if (searchBox) searchBox.focus();
    log.info("SUCCESS");
  }

  focusMainMenuItem(i) {
    log.info(`focusing main menu item ${i}`);
    this.core.mainMenuItems[i].querySelector("a").click();
    this.core.mainMenuItemsIndex = i;
  }
}

export class GoogleStrategy extends BaseStrategy {
  constructor(core) {
    super(core);

    waitFor("#search div[data-rpos]", (el) => {
      this.core.mainItems = document
        .getElementById("search")
        .querySelectorAll("[data-rpos]");
      this.core.mainItems.forEach((el) => {
        el.querySelector("div").style.padding = "10px";
      });
      this.core.mainItemsIndex = 0;
      this.focusMainItem(0, undefined, false);
    });

    waitFor("div[role='listitem'] a[href^='/search?']", (el) => {
      this.core.mainMenuItems = document.querySelectorAll(
        "div[role='listitem'] a[href^='/search?']",
      );
      const currentMenuItem = document.querySelector(
        "div[role='listitem'] a[aria-disabled='true']",
      );
      const num = [...this.core.mainMenuItems].indexOf(currentMenuItem);
      log.info("THE NUM IS " + num + this.core.mainMenuItems + currentMenuItem);
      this.mainMenuItems = num;
      // this.menuItems[this.menuIndex].click();
    });
  }

  openLink() {
    let current = this.core.mainItems[this.core.mainItemsIndex];
    let inner_link = current.querySelector("span a");
    inner_link.click();
  }

  openLinkInNewTab() {
    let current = this.core.mainItems[this.core.mainItemsIndex];
    let inner_link = current.querySelector("span a");
    window.open(inner_link.href, "_blank").blur();
    window.focus();
  }

  focusMainItem(i, j = null, scroll = true) {
    let prev = this.core.mainItems[this.core.mainItemsIndex];
    let prevChild = prev.querySelector("div");
    let current = this.core.mainItems[i];
    let child = current.querySelector("div");
    prevChild.style.border = "1px transparent";
    prevChild.style.backgroundColor = "transparent";
    prevChild.style.borderRadius = "none";

    child.style.border = "1px solid #6b2d5b";
    child.style.backgroundColor = "rgba(216, 179, 194, 0.4)";
    child.style.borderRadius = "10px";
    this.core.mainItemsIndex = i;
    if (scroll) {
      current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    current.focus();
  }

  focusSearch() {
    const searchBox = document.querySelector(
      'form[action="/search"] textarea[aria-label="Search"]',
    );
    if (searchBox) searchBox.focus();
  }
}

export class FacebookMessages extends BaseStrategy {
  constructor() {
    super();

    waitFor("div[aria-label='Chats'] a[href^='/messages/']", (el) => {
      this.menuItems = document.querySelectorAll(
        "div[aria-label='Chats'] a[href^='/messages/']",
      );
      log.info(this.menuItems);
      this.menuItems[this.menuIndex].click();
    });
  }
  menuDown() {
    super.menuDown();
    this.menuItems[this.menuIndex].scrollIntoViewIfNeeded(true);
  }

  menuUp() {
    super.menuUp();
    this.menuItems[this.menuIndex].scrollIntoViewIfNeeded(true);
  }
}

export class StrategyFactory {
  static get(core, hostname) {
    if (hostname.includes("youtube.com")) return new YouTubeStrategy(core);
    if (hostname.includes("google.com")) return new GoogleStrategy(core);
    if (hostname.includes("facebook.com")) return new FacebookMessages(core);
    return new BaseStrategy();
  }
}
