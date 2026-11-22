import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { formatClock, formatWait, loadAllowance, msUntilRefill, setPendingSettings } from "./allowance.ts";
import { Toggle } from "./Toggle.tsx";
import { log } from "./utils.ts";
import type { AllowanceState, LimitedSite, LimitSettings } from "./types.ts";

/** ===========================================================================
 * TIME LIMITS TAB
 * ============================================================================ */

const siteLabels: Record<LimitedSite, string> = {
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
  tiktok: "TikTok",
};

const numberFields: { key: "allowanceMinutes" | "refillHours" | "maxMinutes"; label: string; unit: string }[] = [
  { key: "allowanceMinutes", label: "Allowance per refill", unit: "min" },
  { key: "refillHours", label: "Refill every", unit: "hours" },
  { key: "maxMinutes", label: "Most you can save up", unit: "min" },
];

export function TimeLimitsPanel(): ReactElement {
  const [state, setState] = useState<AllowanceState | null>(null);
  const [draft, setDraft] = useState<LimitSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll so the countdown stays live while another tab is playing
  useEffect(() => {
    let cancelled = false;
    const refresh = (): void => {
      loadAllowance()
        .then((s) => {
          if (cancelled) return;
          setState(s);
          setDraft((d) => d ?? s.pending ?? s.settings);
        })
        .catch((e: unknown) => log.error(e));
    };
    refresh();
    const id = setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!state || !draft) return <p className="m-0 px-5 py-4 text-[13px] text-zinc-400">Loading…</p>;

  const wait = formatWait(msUntilRefill(state));
  const full = state.balance >= state.settings.maxMinutes * 60;
  const unchanged = JSON.stringify(draft) === JSON.stringify(state.pending ?? state.settings);

  async function save(next: LimitSettings): Promise<void> {
    if (next.allowanceMinutes <= 0 || next.refillHours <= 0 || next.maxMinutes < next.allowanceMinutes) {
      setError("Use positive numbers, with the max at least as big as the allowance.");
      return;
    }
    setError(null);
    try {
      await setPendingSettings(next);
      setState(await loadAllowance());
    } catch (e) {
      setError("Couldn't save");
      log.error(e);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
      <section>
        <p className="m-0 text-[28px] font-semibold tabular-nums">{formatClock(state.balance)}</p>
        <p className="m-0 mt-1 text-[13px] text-zinc-400">
          left for short videos, shared by every site below.{" "}
          {full ? "Your allowance is full." : `+${state.settings.allowanceMinutes} min in ${wait}.`}
        </p>
      </section>

      <section>
        <h3 className="m-0 border-b border-zinc-800 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Limited on
        </h3>
        {(Object.keys(siteLabels) as LimitedSite[]).map((site) => (
          <label
            key={site}
            className="flex cursor-pointer items-center justify-between border-b border-zinc-800/70 py-2 text-[13px]"
          >
            {siteLabels[site]}
            <Toggle
              small
              checked={draft.sites[site]}
              label={`Limit ${siteLabels[site]}`}
              onChange={(on) => setDraft({ ...draft, sites: { ...draft.sites, [site]: on } })}
            />
          </label>
        ))}
      </section>

      <section>
        <h3 className="m-0 border-b border-zinc-800 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Limits
        </h3>
        {numberFields.map(({ key, label, unit }) => (
          <label key={key} className="flex items-center justify-between border-b border-zinc-800/70 py-2 text-[13px]">
            {label}
            <span className="flex items-center gap-2 text-zinc-400">
              <input
                type="number"
                min={0}
                step="any"
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                className="w-[72px] rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-right text-[13px] text-zinc-100 outline-none [color-scheme:dark] focus:border-zinc-500"
              />
              <span className="w-[40px]">{unit}</span>
            </span>
          </label>
        ))}
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="m-0 text-[12px] text-zinc-500">
          {state.pending ? `Saved changes switch on at the next refill, in ${wait}.` : `Changes switch on at the next refill, in ${wait}.`}
        </p>
        <button
          type="button"
          disabled={unchanged}
          onClick={() => void save(draft)}
          className="shrink-0 cursor-pointer rounded-md border-0 bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-500 disabled:cursor-default disabled:opacity-50"
        >
          Save for next refill
        </button>
      </div>
      {error && <p className="m-0 text-[12.5px] text-red-300">{error}</p>}
    </div>
  );
}
