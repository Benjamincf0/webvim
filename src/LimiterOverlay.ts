/** ===========================================================================
 * LIMITER OVERLAY
 * The corner countdown and the cover over a held video. Plain DOM in a shadow
 * root so the site's styles can't reach it. Both ignore the mouse, so the page
 * underneath can still be scrolled.
 * ============================================================================ */

const css = `
  div { position: fixed; z-index: 2147483646; pointer-events: none; box-sizing: border-box;
        font: 600 13px/1.4 system-ui, sans-serif; color: #fafafa; }
  .timer { top: 16px; right: 16px; padding: 6px 12px; border-radius: 999px; background: rgba(24, 24, 27, 0.88); }
  .cover { display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center;
           font-size: 15px; background: rgba(9, 9, 11, 0.94); border-radius: 12px; }
  [hidden] { display: none; }
`;

export class LimiterOverlay {
  host: HTMLDivElement | null;
  timer: HTMLDivElement;
  cover: HTMLDivElement;

  constructor() {
    this.host = null;
    this.timer = document.createElement("div");
    this.timer.className = "timer";
    this.cover = document.createElement("div");
    this.cover.className = "cover";
    this.timer.hidden = true;
    this.cover.hidden = true;
  }

  // Attached lazily: content scripts start before <body> exists
  private mount(): void {
    if (this.host || !document.body) return;
    this.host = document.createElement("div");
    const shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    shadow.append(style, this.timer, this.cover);
    document.body.appendChild(this.host);
  }

  showTimer(text: string | null): void {
    this.mount();
    this.timer.hidden = text === null;
    if (text !== null) this.timer.textContent = text;
  }

  showCover(rect: DOMRect | null, text: string): void {
    if (!rect) {
      this.cover.hidden = true;
      return;
    }
    this.mount();
    Object.assign(this.cover.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    this.cover.textContent = text;
    this.cover.hidden = false;
  }
}
