import {
  Bug,
  Clapperboard,
  Gamepad2,
  Lightbulb,
  Presentation,
  type LucideIcon,
} from 'lucide-react';

import type { CreatorCapabilityCode } from './creatorPassport';

interface CapabilityVisual {
  Icon: LucideIcon;
  number: string;
  cardClass: string;
  backgroundClass: string;
  sealClass: string;
  statusClass: string;
  accentClass: string;
  tiltClass: string;
}

export const CAPABILITY_VISUALS: Record<CreatorCapabilityCode, CapabilityVisual> = {
  idea_builder: {
    Icon: Lightbulb,
    number: '01',
    cardClass: 'border-brand-sunshine bg-wash-sunshine shadow-brand-sunshine',
    backgroundClass: 'bg-wash-sunshine',
    sealClass: 'border-brand-sunshine bg-grad-sunshine text-ink',
    statusClass: 'bg-brand-sunshine text-ink',
    accentClass: 'text-brand-sunshine',
    tiltClass: '-rotate-2',
  },
  prompt_director: {
    Icon: Clapperboard,
    number: '02',
    cardClass: 'border-brand-bubblegum bg-wash-bubblegum shadow-brand-bubblegum',
    backgroundClass: 'bg-wash-bubblegum',
    sealClass: 'border-brand-bubblegum bg-grad-bubblegum text-white',
    statusClass: 'bg-brand-bubblegum text-ink',
    accentClass: 'text-brand-bubblegum',
    tiltClass: 'rotate-2',
  },
  bug_hunter: {
    Icon: Bug,
    number: '03',
    cardClass: 'border-brand-mint bg-wash-mint shadow-brand-mint',
    backgroundClass: 'bg-wash-mint',
    sealClass: 'border-brand-mint bg-grad-mint text-white',
    statusClass: 'bg-brand-mint text-ink',
    accentClass: 'text-brand-mint',
    tiltClass: '-rotate-1',
  },
  game_tester: {
    Icon: Gamepad2,
    number: '04',
    cardClass: 'border-brand-sky bg-wash-sky shadow-brand-sky',
    backgroundClass: 'bg-wash-sky',
    sealClass: 'border-brand-sky bg-grad-sky text-white',
    statusClass: 'bg-brand-sky text-ink',
    accentClass: 'text-brand-sky',
    tiltClass: 'rotate-1',
  },
  project_presenter: {
    Icon: Presentation,
    number: '05',
    cardClass: 'border-brand-coral bg-wash-coral shadow-brand-coral',
    backgroundClass: 'bg-wash-coral',
    sealClass: 'border-brand-coral bg-grad-coral text-white',
    statusClass: 'bg-brand-coral text-ink',
    accentClass: 'text-brand-coral',
    tiltClass: '-rotate-2',
  },
};
