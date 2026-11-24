import { formatClock, formatWait, loadAllowance, msUntilRefill, spendAllowance } from "./allowance.ts";
import { LimiterOverlay } from "./LimiterOverlay.ts";
import { log } from "./utils.ts";
import type { ShortsSite } from "./shortsSites.ts";
import type { AllowanceState } from "./types.ts";

/** ===========================================================================
 * SHORTS LIMITER
 * Once a second: spend allowance while a limited video plays, pause and cover
 * videos that don't fit in what's left, and block the feed when it runs out.
 * ============================================================================ */

const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown"];

// Secret slack: a video that's started can run up to this long past 0:00, so the timer can actually
// reach zero without cutting you off mid-video. Nothing new can play or be scrolled to meanwhile.
const graceSeconds = 30;

export class ShortsLimiter {
  site: ShortsSite;
  state: AllowanceState | null;
  overlay: LimiterOverlay;
  coverVideo: HTMLVideoElement | null;
  coverText: string;
  feedStyle: HTMLStyleElement;
  friendPath: string | null;
  // The video allowed to finish after the timer hit 0, until it ends, loops or the grace runs out
  graceVideo: HTMLVideoElement | null;
  graceSrc: string;
  graceEnd: number;
  graceLastTime: number;

  constructor(site: ShortsSite) {
    this.site = site;
    this.state = null;
    this.overlay = new LimiterOverlay();
    this.coverVideo = null;
    this.coverText = "";
    this.graceVideo = null;
    this.graceSrc = "";
    this.graceEnd = 0;
    this.graceLastTime = 0;
    this.feedStyle = document.createElement("style");
    if (site.hiddenFeedSelector) this.feedStyle.textContent = `${site.hiddenFeedSelector} { display: none !important; }`;
    // A reel opened straight from a link (e.g. sent in another app) rather than from inside the site
    const fromOutside = !document.referrer.includes(site.host);
    this.friendPath =
      site.friendReels && fromOutside && location.pathname.startsWith(site.friendReels.path) ? location.pathname : null;

    // "play" doesn't bubble, so catch it on the way down
    document.addEventListener("play", (e) => this.onPlay(e), true);
    document.addEventListener("timeupdate", (e) => this.onTimeUpdate(e), true);
    window.addEventListener("click", (e) => this.onClick(e), true);
    window.addEventListener("wheel", (e) => this.lockScroll(e), { capture: true, passive: false });
    window.addEventListener("touchmove", (e) => this.lockScroll(e), { capture: true, passive: false });
    window.addEventListener("keydown", (e) => scrollKeys.includes(e.key) && this.lockScroll(e), true);

    // Run right away too, so videos can't play during the first second after load
    const run = (): void => void this.tick().catch((e: unknown) => log.error(e));
    run();
    setInterval(run, 1000);
    this.followCover();
  }

  isOn(): boolean {
    return !!this.state?.settings.sites[this.site.id];
  }

  isFriendReel(): boolean {
    return !!this.site.friendReels && location.pathname === this.friendPath;
  }

  onLimitedPage(): boolean {
    return this.site.isLimitedPage() && !this.isFriendReel();
  }

  isOutOfTime(): boolean {
    return this.isOn() && !!this.state && this.state.balance <= 0;
  }

  async tick(): Promise<void> {
    const video = this.isOn() && this.onLimitedPage() ? this.mainVideo() : null;
    const watching =
      !!video && !video.paused && !video.ended && document.visibilityState === "visible" && !this.holdReason(video);
    const before = this.state?.balance ?? 0;
    this.state = watching ? await spendAllowance(1) : await loadAllowance();
    if (watching && video && before > 0 && this.state.balance <= 0) this.startGrace(video);
    if (this.graceVideo && Date.now() > this.graceEnd) this.endGrace();

    if (!this.isOn() || !this.onLimitedPage()) {
      this.overlay.showTimer(null);
      this.coverVideo = null;
    } else {
      if (this.isOutOfTime()) document.querySelectorAll("video").forEach((v) => v !== this.graceVideo && v.pause());
      const reason = video ? this.holdReason(video) : null;
      if (video && reason) video.pause();
      this.coverVideo = reason ? video : null;
      this.coverText = reason ?? "";
      this.overlay.showTimer(this.statusText());
    }
    this.updateLinks();
    this.updateFeedStyle();
  }

  startGrace(video: HTMLVideoElement): void {
    this.graceVideo = video;
    this.graceSrc = video.currentSrc;
    this.graceEnd = Date.now() + graceSeconds * 1000;
    this.graceLastTime = video.currentTime;
  }

  endGrace(): void {
    this.graceVideo?.pause();
    this.graceVideo = null;
  }

  // Ends the grace as soon as its video finishes, loops back to the start or is swapped for another
  onTimeUpdate(e: Event): void {
    const video = this.graceVideo;
    if (!video || e.target !== video) return;
    const looped = video.currentTime < this.graceLastTime;
    this.graceLastTime = video.currentTime;
    if (looped || video.ended || video.currentSrc !== this.graceSrc || Date.now() > this.graceEnd) this.endGrace();
  }

  updateFeedStyle(): void {
    if (!this.site.hiddenFeedSelector) return;
    if (this.isOn() && !this.feedStyle.isConnected) document.documentElement.appendChild(this.feedStyle);
    if (!this.isOn()) this.feedStyle.remove();
  }

  // Why this video can't play right now, or null if it can
  holdReason(video: HTMLVideoElement): string | null {
    if (!this.state) return null;
    if (this.isOutOfTime()) return video === this.graceVideo ? null : this.statusText();
    const remaining = video.duration - video.currentTime;
    // Anything that fits once the grace is counted may start
    if (Number.isFinite(remaining) && remaining > this.state.balance + graceSeconds) {
      return `This one is ${formatClock(video.duration)}, you have ${formatClock(this.state.balance)} left. Scroll past it.`;
    }
    return null;
  }

  statusText(): string {
    if (!this.state) return "";
    const { label } = this.site;
    if (this.state.balance > 0) return `${label} ${formatClock(this.state.balance)}`;
    return `${label} blocked · refills in ${formatWait(msUntilRefill(this.state))}`;
  }

  // The video taking up the most of the screen is the one being watched
  mainVideo(): HTMLVideoElement | null {
    let best: HTMLVideoElement | null = null;
    let bestArea = 0;
    document.querySelectorAll("video").forEach((video) => {
      const r = video.getBoundingClientRect();
      const width = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
      const height = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      const area = width > 0 && height > 0 ? width * height : 0;
      if (area > bestArea) {
        best = video;
        bestArea = area;
      }
    });
    return best;
  }

  // Stops a held video between ticks, e.g. when the site autoplays it or it's clicked
  onPlay(e: Event): void {
    const video = e.target;
    if (!(video instanceof HTMLVideoElement) || !this.isOn() || !this.onLimitedPage()) return;
    if (this.holdReason(video)) video.pause();
  }

  onClick(e: MouseEvent): void {
    if (!(e.target instanceof Element)) return;
    const friend = this.site.friendReels;
    const reelLink = friend ? e.target.closest<HTMLAnchorElement>(`a[href^="${friend.path}"]`) : null;
    if (friend && reelLink && location.pathname.startsWith(friend.sharedFrom)) {
      this.friendPath = new URL(reelLink.href).pathname;
      return;
    }
    const selector = this.site.linkSelector;
    if (selector && this.isOutOfTime() && e.target.closest(selector)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // No scrolling on friend reels, or on to a new video while the last one finishes after 0:00
  lockScroll(e: Event): void {
    if (!this.isOn() || !(this.isFriendReel() || this.graceVideo)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  updateLinks(): void {
    const selector = this.site.linkSelector;
    if (!selector || !this.state) return;
    const blocked = this.isOutOfTime();
    let title = "";
    if (this.isOn()) {
      title = blocked
        ? this.statusText()
        : `${formatClock(this.state.balance)} of ${this.site.label} left · refill in ${formatWait(msUntilRefill(this.state))}`;
    }
    document.querySelectorAll<HTMLElement>(selector).forEach((link) => {
      link.title = title;
      link.style.opacity = blocked ? "0.35" : "";
      link.style.cursor = blocked ? "not-allowed" : "";
    });
  }

  // Keeps the cover on top of its video while the page scrolls
  followCover(): void {
    const frame = (): void => {
      const rect = this.coverVideo?.isConnected ? this.coverVideo.getBoundingClientRect() : null;
      this.overlay.showCover(rect, this.coverText);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
