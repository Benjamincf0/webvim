import type { LimitedSite } from "./types.ts";

/** ===========================================================================
 * SITES WITH LIMITED SHORT VIDEOS
 * Page detection and selectors for each site live here, so when a site
 * changes its markup this is the only file to fix.
 * ============================================================================ */

export interface ShortsSite {
  id: LimitedSite;
  host: string;
  label: string;
  // Videos playing on this page spend the allowance
  isLimitedPage: () => boolean;
  // Reels a friend sent: free to watch, but no scrolling to more reels. A reel at `path` counts as
  // sent by a friend when it was opened from a page under `sharedFrom` or from outside the site.
  friendReels: { path: string; sharedFrom: string } | null;
  // Links into short videos (nav button, thumbnails), blocked when the allowance runs out
  linkSelector: string | null;
  // Short-video sections in the site's other feeds, hidden whenever the limit is on
  hiddenFeedSelector: string | null;
}

const path = (): string => window.location.pathname;

export const shortsSites: ShortsSite[] = [
  {
    id: "youtube",
    host: "youtube.com",
    label: "Shorts",
    isLimitedPage: () => path().startsWith("/shorts"),
    friendReels: null,
    linkSelector: 'a[title="Shorts"], a[href^="/shorts"]',
    hiddenFeedSelector: [
      "ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])", // home page Shorts shelf
      "ytd-rich-section-renderer:has(ytm-shorts-lockup-view-model)", // newer home page shelf
      'ytd-rich-item-renderer:has(a[href^="/shorts/"])', // single Shorts in the home grid
      "ytd-reel-shelf-renderer", // Shorts shelf in search and subscriptions
    ].join(", "),
  },
  {
    id: "instagram",
    host: "instagram.com",
    label: "Reels",
    // The home feed, explore and reels are limited; DMs and stories aren't
    isLimitedPage: () => path() === "/" || /^\/(reels?|explore)\//.test(path()),
    friendReels: { path: "/reel/", sharedFrom: "/direct/" },
    linkSelector: 'a[href^="/reels"], a[href^="/reel/"]',
    hiddenFeedSelector: null,
  },
  {
    id: "tiktok",
    host: "tiktok.com",
    label: "TikTok",
    isLimitedPage: () => true,
    friendReels: null,
    linkSelector: null,
    hiddenFeedSelector: null,
  },
];

export function getShortsSite(hostname: string): ShortsSite | undefined {
  return shortsSites.find((site) => hostname === site.host || hostname.endsWith(`.${site.host}`));
}
