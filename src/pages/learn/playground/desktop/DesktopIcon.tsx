// Desktop shortcut icon for the playground virtual desktop. A kid-friendly
// rounded tile (emoji) with a label beneath; click or double-click opens (or
// focuses, if already open) the matching window. Per virtual-desktop-design §4
// / mockup "Desktop shortcuts".

import type { WindowId } from './windowStore';
import { useWindowStore } from './windowStore';

interface DesktopIconProps {
  id: WindowId;
  label: string;
  icon: string;
}

export function DesktopIcon({ id, label, icon }: DesktopIconProps) {
  const openOrFocus = useWindowStore((state) => state.openOrFocus);

  // Single click is enough to open/focus (kid-friendly); double-click resolves
  // to the same action so the shortcut behaves like a familiar desktop icon.
  const open = () => openOrFocus(id);

  return (
    <button
      type="button"
      onClick={open}
      onDoubleClick={open}
      aria-label={label}
      className="group flex w-24 flex-col items-center gap-2 rounded-2xl p-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-sky"
    >
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-sky/30 bg-wash-sky text-[34px] leading-none shadow-card-soft transition-transform group-hover:scale-105 group-active:scale-95"
      >
        {icon}
      </span>
      <span className="text-[13px] font-bold leading-tight text-ink">
        {label}
      </span>
    </button>
  );
}
