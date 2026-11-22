import type { ReactElement } from "react";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  small?: boolean;
};

export function Toggle({ checked, onChange, label, small = false }: ToggleProps): ReactElement {
  const track = small ? "h-[16px] w-[28px]" : "h-[22px] w-[40px]";
  const knob = small ? "h-[12px] w-[12px]" : "h-[18px] w-[18px]";
  const on = small ? "ml-[14px]" : "ml-[20px]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative ${track} shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors ${
        checked ? "bg-blue-600" : "bg-zinc-700"
      }`}
    >
      {/* margin instead of translate: Tailwind's transform vars don't initialise inside shadow DOM */}
      <span className={`block ${knob} rounded-full bg-white transition-all ${checked ? on : "ml-[2px]"}`} />
    </button>
  );
}
