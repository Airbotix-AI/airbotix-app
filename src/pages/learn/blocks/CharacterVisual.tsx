import type { Character } from './blocksModel';

interface CharacterVisualProps {
  character: Pick<Character, 'name' | 'emoji' | 'asset'>;
  className?: string;
}

export function CharacterVisual({ character, className }: CharacterVisualProps) {
  if (character.asset) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
        src={character.asset}
      />
    );
  }
  return <span className={className}>{character.emoji}</span>;
}
