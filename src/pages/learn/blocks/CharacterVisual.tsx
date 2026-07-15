import type { CharacterPerformance } from './characterPerformance';
import { LumiloCharacter } from './LumiloCharacter';
import { TuanTuanCharacter } from './TuanTuanCharacter';

const LUMILO_ASSET_SEGMENT = '/tiny-star-village/characters/little-light/';
const TUAN_TUAN_ASSET_SEGMENT = '/tiny-star-village/characters/cloud-bear/';

interface CharacterVisualProps {
  character: { name: string; emoji?: string; asset?: string };
  className?: string;
  performance?: CharacterPerformance;
}

export function CharacterVisual({
  character,
  className,
  performance = 'idle',
}: CharacterVisualProps) {
  if (character.asset?.includes(LUMILO_ASSET_SEGMENT)) {
    return <LumiloCharacter className={className} performance={performance} />;
  }
  if (character.asset?.includes(TUAN_TUAN_ASSET_SEGMENT)) {
    return <TuanTuanCharacter className={className} performance={performance} />;
  }
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
  return <span className={className}>{character.emoji ?? '⭐'}</span>;
}
