import { waitFor, log, triggerKeyDown } from "./utils.js";
import type { ExtensionCore } from "./types.js";

export class BaseStrategy {
  core: ExtensionCore;

  constructor(core: ExtensionCore) {
    this.core = core;
  }

  setNormalMode(): void {
    log.info("setNormalMode");
  }

  goHome(): void {
    window.location.href = "/";
  }

  menuUp(): void {
    const items = this.core.mainMenuItems;
    if (items && items.length > 0 && this.core.mainMenuItemsIndex > 0) {
      const item = items[--this.core.mainMenuItemsIndex];
      if (item) item.click();
    }
  }

  menuDown(): void {
    const items = this.core.mainMenuItems;
    if (
      items &&
      items.length > 0 &&
      this.core.mainMenuItemsIndex < items.length - 1
    ) {
      const item = items[++this.core.mainMenuItemsIndex];
      if (item) item.click();
    }
  }

  goUp(): void {
    log.info("goUp");
  }

  goDown(): void {
    log.info("goDown");
  }

  focusSearch(): void {
    log.info("focusSearch");
  }

  setNavMode(): void {
    log.info(`Current active element: ${document.activeElement}`);
    setTimeout(() => {
      document.activeElement?.blur();
    }, 0);
    log.info(`Current active element: ${document.activeElement}`);
    log.info("setNavMode");
  }

  setInsertMode(): void {
    log.info("setInsertMode");
  }

  setVisualLineMode(): void {
    document.activeElement?.select();
    log.info("setVisualLineMode");
  }

  setVisualCharMode(): void {
    log.info("setVisualCharMode");
  }

  focusMainItem(i: number, j?: number, scroll?: boolean): void {
    log.info("focusMainItem", i, j, scroll);
  }

  openLink(): void {
    log.info("openLink");
  }

  openLinkInNewTab(): void {
    log.info("openLinkInNewTab");
  }

  moveCursorDown(): void {
    log.info("moveCursorDown");
  }

  moveCursorUp(): void {
    log.info("moveCursorUp");
  }

  deleteChar(): void {
    log.info("deleteChar");
  }

  deleteLine(): void {
    log.info("deleteLine");
  }
}

export class YouTubeStrategy extends BaseStrategy {
  constructor(core: ExtensionCore) {
    super(core);

    waitFor("#contents yt-touch-feedback-shape", () => {
      const items = document.querySelectorAll("#contents #content");
      this.core.mainItems = Array.from(items) as HTMLElement[];
      this.core.mainItemsIndex = 0;
      this.focusMainItem(0, undefined, false);
    });

    waitFor("#items", () => {
      const menuItems = document.querySelector("#items")?.children;
      if (menuItems) {
        this.core.mainMenuItems = Array.from(menuItems) as HTMLElement[];
        this.core.mainMenuItemsIndex = 0;
      }
    });
  }

  override focusMainItem(
    i: number,
    _j: number | undefined = undefined,
    _scroll: boolean = true,
  ): void {
    const items = this.core.mainItems;
    if (!items || !items[i]) return;
    const newItem = items[i].querySelector(
      "yt-touch-feedback-shape",
    ) as HTMLElement;
    if (newItem) {
      newItem.classList.add("yt-spec-touch-feedback-shape--hovered");
    }
  }

  override focusSearch(): void {
    const searchBox = document.querySelector(
      'form[action="/results"] input[name="search_query"]',
    ) as HTMLInputElement | null;
    if (searchBox) searchBox.focus();
  }

  focusMainMenuItem(i: number): void {
    const items = this.core.mainMenuItems;
    if (!items || !items[i]) return;
    const link = items[i].querySelector("a") as HTMLAnchorElement | null;
    if (link) link.click();
    this.core.mainMenuItemsIndex = i;
  }
}

export class GoogleStrategy extends BaseStrategy {
  constructor(core: ExtensionCore) {
    super(core);

    waitFor("#search div[data-rpos]", () => {
      const searchEl = document.getElementById("search");
      if (searchEl) {
        const items = searchEl.querySelectorAll("[data-rpos]");
        this.core.mainItems = Array.from(items) as HTMLElement[];
        this.core.mainItemsIndex = 0;
        this.focusMainItem(0, undefined, false);
      }
    });

    waitFor("div[role='listitem'] a[href^='/search?']", () => {
      const menuItems = document.querySelectorAll(
        "div[role='listitem'] a[href^='/search?']",
      );
      this.core.mainMenuItems = Array.from(menuItems) as HTMLElement[];
      const currentMenuItem = document.querySelector(
        "div[role='listitem'] a[aria-disabled='true']",
      );
      if (currentMenuItem) {
        const num = Array.from(this.core.mainMenuItems).indexOf(
          currentMenuItem as unknown as HTMLElement,
        );
        this.core.mainMenuItemsIndex = num >= 0 ? num : 0;
      }
    });
  }

  override openLink(): void {
    const current = this.core.mainItems[this.core.mainItemsIndex];
    if (!current) return;
    const innerLink = current.querySelector(
      "span a",
    ) as HTMLAnchorElement | null;
    if (innerLink) innerLink.click();
  }

  override openLinkInNewTab(): void {
    const current = this.core.mainItems[this.core.mainItemsIndex];
    if (!current) return;
    const innerLink = current.querySelector(
      "span a",
    ) as HTMLAnchorElement | null;
    if (innerLink) {
      window.open(innerLink.href, "_blank")?.blur();
      window.focus();
    }
  }

  override focusMainItem(
    i: number,
    _j: number | undefined = undefined,
    scroll: boolean = true,
  ): void {
    const items = this.core.mainItems;
    if (!items || !items[i]) return;

    const prev = items[this.core.mainItemsIndex];
    const prevChild = prev?.querySelector("div") as HTMLElement | null;
    if (prevChild) {
      prevChild.style.border = "1px transparent";
      prevChild.style.backgroundColor = "transparent";
      prevChild.style.borderRadius = "none";
    }

    const current = items[i];
    const child = current.querySelector("div") as HTMLElement | null;
    if (child) {
      child.style.border = "1px solid #6b2d5b";
      child.style.backgroundColor = "rgba(216, 179, 194, 0.4)";
      child.style.borderRadius = "10px";
    }

    this.core.mainItemsIndex = i;
    if (scroll) {
      current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    (current as HTMLElement).focus();
  }

  override focusSearch(): void {
    const searchBox = document.querySelector(
      'form[action="/search"] textarea[aria-label="Search"]',
    ) as HTMLTextAreaElement | null;
    if (searchBox) searchBox.focus();
  }
}

export class FacebookMessages extends BaseStrategy {
  menuIndex: number;
  menuItems: HTMLElement[];

  constructor(core: ExtensionCore) {
    super(core);
    this.menuIndex = 0;
    this.menuItems = [];

    waitFor("div[aria-label='Chats'] a[href^='/messages/']", () => {
      this.menuItems = Array.from(
        document.querySelectorAll(
          "div[aria-label='Chats'] a[href^='/messages/']",
        ),
      ) as HTMLElement[];
      const item = this.menuItems[this.menuIndex];
      if (item) {
        item.click();
      }
    });
  }

  override menuDown(): void {
    super.menuDown();
    const item = this.menuItems[this.menuIndex];
    if (item) {
      (
        item as unknown as { scrollIntoViewIfNeeded: (arg: boolean) => void }
      ).scrollIntoViewIfNeeded(true);
    }
  }

  override menuUp(): void {
    super.menuUp();
    const item = this.menuItems[this.menuIndex];
    if (item) {
      (
        item as unknown as { scrollIntoViewIfNeeded: (arg: boolean) => void }
      ).scrollIntoViewIfNeeded(true);
    }
  }
}

export class StrategyFactory {
  static get(core: ExtensionCore, hostname: string): BaseStrategy {
    if (hostname.includes("youtube.com")) return new YouTubeStrategy(core);
    if (hostname.includes("google.com")) return new GoogleStrategy(core);
    if (hostname.includes("facebook.com")) return new FacebookMessages(core);
    return new BaseStrategy(core);
  }
}
