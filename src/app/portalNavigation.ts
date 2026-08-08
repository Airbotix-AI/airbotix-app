import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  LibraryBig,
  MessageCircle,
  ReceiptText,
  Search,
  Settings,
  UserRoundSearch,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

export interface PortalNavItem {
  id: string;
  to: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface PortalNavSection {
  id: string;
  /** Section heading; null for the ungrouped top area (Dashboard). */
  label: string | null;
  items: PortalNavItem[];
}

// Grouped IA per parent-portal-prd.md §2: Explore (discover & enrol),
// Family (monitor & control), Account (money & settings).
export const PORTAL_NAV_SECTIONS: PortalNavSection[] = [
  {
    id: 'overview',
    label: null,
    items: [
      {
        id: 'dashboard',
        to: '/portal',
        label: 'Dashboard',
        mobileLabel: 'Home',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    items: [
      {
        id: 'classes',
        to: '/portal/classes',
        label: 'Find a class',
        mobileLabel: 'Classes',
        icon: Search,
      },
      { id: 'courses', to: '/portal/courses', label: 'Courses', icon: BookOpen },
      { id: 'teachers', to: '/portal/teachers', label: 'Teachers', icon: UserRoundSearch },
      { id: 'academy', to: '/portal/academy', label: 'Exam Prep', icon: GraduationCap },
      { id: 'tutoring', to: '/portal/tutoring', label: 'Tutoring', icon: MessageCircle },
      { id: 'guides', to: '/portal/guides', label: 'Family Guides', icon: LibraryBig },
    ],
  },
  {
    id: 'family',
    label: 'Family',
    items: [
      { id: 'family', to: '/portal/family', label: 'My Family', mobileLabel: 'Family', icon: Users },
      { id: 'hsc', to: '/portal/academy/hsc-planner', label: 'HSC Planner', icon: ClipboardList },
      { id: 'approvals', to: '/portal/approvals', label: 'Approvals', icon: Bell },
      { id: 'usage', to: '/portal/usage', label: 'Usage', icon: BarChart3 },
      { id: 'audit', to: '/portal/audit', label: 'Activity', icon: History },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { id: 'wallet', to: '/portal/wallet', label: 'Wallet', icon: WalletCards },
      { id: 'billing', to: '/portal/billing', label: 'Billing', icon: ReceiptText },
      { id: 'settings', to: '/portal/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const PORTAL_NAV_ITEMS: PortalNavItem[] = PORTAL_NAV_SECTIONS.flatMap(
  (section) => section.items,
);

const MOBILE_PRIMARY_IDS = new Set(['dashboard', 'classes', 'family', 'wallet']);

export const PORTAL_MOBILE_PRIMARY_ITEMS = PORTAL_NAV_ITEMS.filter((item) =>
  MOBILE_PRIMARY_IDS.has(item.id),
);

export const PORTAL_MOBILE_MORE_ITEMS = PORTAL_NAV_ITEMS.filter(
  (item) => !MOBILE_PRIMARY_IDS.has(item.id),
);

// The More sheet mirrors the drawer's grouping, minus the items already pinned
// to the bottom tab bar (a section whose items are all pinned disappears).
export const PORTAL_MOBILE_MORE_SECTIONS: PortalNavSection[] = PORTAL_NAV_SECTIONS.map(
  (section) => ({
    ...section,
    items: section.items.filter((item) => !MOBILE_PRIMARY_IDS.has(item.id)),
  }),
).filter((section) => section.items.length > 0);
