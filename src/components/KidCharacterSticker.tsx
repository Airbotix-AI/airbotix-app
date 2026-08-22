const CHARACTER_STICKER_PATHS = {
  lumi: '/media/characters/stickers/lumi-digital-artist.webp',
  'lumi-welcome': '/media/characters/stickers/lumi-welcome.webp',
  tuantuan: '/media/characters/stickers/tuantuan-science-explorer.webp',
  'tuantuan-thinking': '/media/characters/stickers/tuantuan-thinking.webp',
  airo: '/media/characters/stickers/airo-game-designer.webp',
  'airo-building': '/media/characters/stickers/airo-building.webp',
  bix: '/media/characters/stickers/bix-ai-creator.webp',
  'bix-celebrating': '/media/characters/stickers/bix-celebrating.webp',
} as const;

export type KidCharacterStickerId = keyof typeof CHARACTER_STICKER_PATHS;

interface KidCharacterStickerProps {
  character: KidCharacterStickerId;
  className?: string;
  priority?: boolean;
  testId?: string;
}

export function KidCharacterSticker({
  character,
  className = '',
  priority = false,
  testId,
}: KidCharacterStickerProps) {
  return (
    <img
      src={CHARACTER_STICKER_PATHS[character]}
      alt=""
      aria-hidden="true"
      className={`pointer-events-none select-none object-contain ${className}`}
      data-character={character}
      data-testid={testId}
      decoding={priority ? 'sync' : 'async'}
      draggable={false}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
}
