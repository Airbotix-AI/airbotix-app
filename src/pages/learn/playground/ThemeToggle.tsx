import { Moon, Sun } from 'lucide-react';

import { usePlaygroundStore } from './playgroundStore';

interface ThemeToggleProps {
  /** Extra classes for positioning (e.g. absolute corner on the landing screen). */
  className?: string;
}

/**
 * Icon button that flips the playground theme (light ⇄ dark) in the store.
 * The whole playground re-themes from `data-theme` on the root, so this control
 * is identical wherever it's placed (landing corner, workspace taskbar). Shows
 * the icon of the theme you'd switch TO (moon while light, sun while dark).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = usePlaygroundStore((s) => s.theme);
  const toggleTheme = usePlaygroundStore((s) => s.toggleTheme);
  const next = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-pg-border bg-pg-surface text-pg-text-dim transition-colors hover:border-brand-sky hover:text-pg-text ${className ?? ''}`}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
