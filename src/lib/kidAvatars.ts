export const KID_AVATARS = [
  ['rocket_fox', 'Rocket Fox', 'animal'],
  ['coding_koala', 'Coding Koala', 'animal'],
  ['doodle_panda', 'Doodle Panda', 'animal'],
  ['inventor_octopus', 'Inventor Octopus', 'animal'],
  ['wise_owl', 'Wise Owl', 'animal'],
  ['space_cat', 'Space Cat', 'animal'],
  ['explorer_dog', 'Explorer Dog', 'animal'],
  ['maker_dinosaur', 'Maker Dinosaur', 'animal'],
  ['music_frog', 'Music Frog', 'animal'],
  ['surfer_shark', 'Surfer Shark', 'animal'],
  ['curious_axolotl', 'Curious Axolotl', 'animal'],
  ['builder_beaver', 'Builder Beaver', 'animal'],
  ['robot_friend', 'Robot Friend', 'fantasy'],
  ['pixel_monster', 'Pixel Monster', 'fantasy'],
  ['little_dragon', 'Little Dragon', 'fantasy'],
  ['star_buddy', 'Star Buddy', 'fantasy'],
  ['creative_artist', 'Creative Artist', 'human'],
  ['space_explorer', 'Space Explorer', 'human'],
  ['junior_inventor', 'Junior Inventor', 'human'],
  ['game_designer', 'Game Designer', 'human'],
  ['music_maker', 'Music Maker', 'human'],
  ['story_creator', 'Story Creator', 'human'],
  ['young_scientist', 'Young Scientist', 'human'],
  ['little_engineer', 'Little Engineer', 'human'],
  ['nature_explorer', 'Nature Explorer', 'human'],
  ['young_architect', 'Young Architect', 'human'],
] as const;

export type KidAvatarId = (typeof KID_AVATARS)[number][0];
export const DEFAULT_KID_AVATAR_ID: KidAvatarId = 'robot_friend';

export function kidAvatarAsset(id?: string | null): string {
  const safeId = KID_AVATARS.some(([avatarId]) => avatarId === id) ? id! : DEFAULT_KID_AVATAR_ID;
  return `/avatars/v1/${safeId.replaceAll('_', '-')}.webp`;
}

export function kidAvatarName(id?: string | null): string {
  return KID_AVATARS.find(([avatarId]) => avatarId === id)?.[1] ?? 'Robot Friend';
}
