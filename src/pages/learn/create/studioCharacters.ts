import type { KidCharacterStickerId } from '@/components/KidCharacterSticker';
import type { CreateTool } from './createTools';

/** One shared role assignment for every child and parent studio-discovery surface. */
export const STUDIO_CHARACTERS: Record<CreateTool['id'], KidCharacterStickerId> = {
  'story-blocks': 'lumi',
  'creative-code': 'airo',
  'website-studio': 'bix',
  'art-studio': 'lumi',
  'music-stage': 'tuantuan',
  'voice-booth': 'tuantuan-thinking',
  'video-studio': 'bix',
};
