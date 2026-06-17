import { useState } from 'react';

const PRIMARY_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Lo-fi', 'Cinematic',
  'Electronic', 'Classical', 'R&B', 'K-Pop', 'EDM', 'Acoustic',
];

const EXTENDED_GENRES = ['Reggae', 'Country', 'Folk', 'Funk', 'Metal', 'Bossa Nova', 'Ambient'];

export function GenreTagCloud({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (genre: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const genres = expanded ? [...PRIMARY_GENRES, ...EXTENDED_GENRES] : PRIMARY_GENRES;

  const handleToggle = (genre: string) => {
    if (selected.includes(genre)) {
      onToggle(genre);
      return;
    }
    if (selected.length >= 2) return;
    onToggle(genre);
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {genres.map((genre) => {
        const active = selected.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            onClick={() => handleToggle(genre)}
            disabled={!active && selected.length >= 2}
            className={
              active
                ? 'rounded-full px-3 py-1 text-[12px] font-semibold bg-brand-coral text-white transition-colors'
                : 'rounded-full px-3 py-1 text-[12px] font-semibold bg-surface text-ink-soft hover:bg-wash-coral disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            }
          >
            {genre}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="rounded-full px-3 py-1 text-[12px] font-semibold bg-surface text-ink-soft hover:bg-wash-coral transition-colors"
      >
        {expanded ? '− Less' : '+ More'}
      </button>
    </div>
  );
}
