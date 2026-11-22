import type { AllowanceState, LimitSettings } from "./types.ts";

/** ===========================================================================
 * SHORT-VIDEO ALLOWANCE
 * Stored in chrome.storage.local, which every tab and site of the extension
 * shares, so Shorts, Reels and TikTok all spend the same allowance.
 * ============================================================================ */

const storageKey = "shortsAllowance";
const hourMs = 60 * 60 * 1000;

export const defaultLimitSettings: LimitSettings = {
  allowanceMinutes: 6,
  refillHours: 2,
  maxMinutes: 12,
  sites: { youtube: true, instagram: true, tiktok: true },
};

// Adds a full allowance for each whole refill period, up to the max. Pending settings only
// switch on here, so changing them can't top up the allowance early.
function refill(state: AllowanceState, now: number): AllowanceState {
  const periodMs = state.settings.refillHours * hourMs;
  const periods = Math.floor((now - state.lastRefill) / periodMs);
  if (periods < 1) return state;
  const settings = state.pending ?? state.settings;
  return {
    settings,
    pending: null,
    lastRefill: state.lastRefill + periods * periodMs,
    balance: Math.min(settings.maxMinutes * 60, state.balance + periods * settings.allowanceMinutes * 60),
  };
}

async function save(state: AllowanceState): Promise<void> {
  await window.chrome.storage.local.set({ [storageKey]: state });
}

export async function loadAllowance(): Promise<AllowanceState> {
  const now = Date.now();
  const result = await window.chrome.storage.local.get(storageKey);
  const stored = result[storageKey] as AllowanceState | undefined;
  const initial: AllowanceState = {
    balance: defaultLimitSettings.allowanceMinutes * 60,
    lastRefill: now,
    settings: defaultLimitSettings,
    pending: null,
  };
  const state = refill(stored ?? initial, now);
  if (state !== stored) await save(state);
  return state;
}

export async function spendAllowance(seconds: number): Promise<AllowanceState> {
  const state = await loadAllowance();
  const balance = Math.max(0, state.balance - seconds);
  // Running out restarts the refill clock, so you always wait a full period for more
  const lastRefill = balance === 0 && state.balance > 0 ? Date.now() : state.lastRefill;
  const next = { ...state, balance, lastRefill };
  await save(next);
  return next;
}

export async function setPendingSettings(settings: LimitSettings): Promise<void> {
  const state = await loadAllowance();
  await save({ ...state, pending: settings });
}

export function msUntilRefill(state: AllowanceState): number {
  return Math.max(0, state.lastRefill + state.settings.refillHours * hourMs - Date.now());
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
