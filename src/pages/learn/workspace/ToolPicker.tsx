export type ToolKind = 'chat' | 'image' | 'music' | 'voice' | 'video';

const TOOLS: Array<{ id: ToolKind; emoji: string; label: string; cost: number; color: string }> = [
  { id: 'chat',  emoji: '💬', label: 'Chat',  cost: 1, color: 'wash-coral' },
  { id: 'image', emoji: '🎨', label: 'Image', cost: 4, color: 'wash-bubblegum' },
  { id: 'music', emoji: '🎵', label: 'Music', cost: 3, color: 'wash-mint' },
  { id: 'voice', emoji: '🔊', label: 'Voice', cost: 1, color: 'wash-sky' },
  { id: 'video', emoji: '🎬', label: 'Video', cost: 5, color: 'wash-sunshine' },
];

export function ToolPicker({
  value,
  onChange,
}: {
  value: ToolKind;
  onChange: (v: ToolKind) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={
            value === t.id
              ? `inline-flex items-center gap-2 rounded-full bg-${t.color} text-ink px-3 py-2 text-[12px] font-bold ring-2 ring-ink/30`
              : `inline-flex items-center gap-2 rounded-full bg-surface text-ink-soft px-3 py-2 text-[12px] font-semibold hover:bg-${t.color} hover:text-ink transition-colors`
          }
        >
          <span>{t.emoji}</span>
          <span>{t.label}</span>
          <span className="opacity-60">−{t.cost}★</span>
        </button>
      ))}
    </div>
  );
}
