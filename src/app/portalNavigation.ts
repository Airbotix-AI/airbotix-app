import {
  BarChart3,
  Bell,
  BookOpen,
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

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  {
    id: 'dashboard',
    to: '/portal',
    label: 'Dashboard',
    mobileLabel: 'Home',
    icon: LayoutDashboard,
    end: true,
  },
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
  { id: 'family', to: '/portal/family', label: 'My Family', mobileLabel: 'Family', icon: Users },
  { id: 'wallet', to: '/portal/wallet', label: 'Wallet', icon: WalletCards },
  { id: 'usage', to: '/portal/usage', label: 'Usage', icon: BarChart3 },
  { id: 'approvals', to: '/portal/approvals', label: 'Approvals', icon: Bell },
  { id: 'audit', to: '/portal/audit', label: 'Activity', icon: History },
  { id: 'billing', to: '/portal/billing', label: 'Billing', icon: ReceiptText },
  { id: 'settings', to: '/portal/settings', label: 'Settings', icon: Settings },
];

const MOBILE_PRIMARY_IDS = new Set(['dashboard', 'classes', 'family', 'wallet']);

export const PORTAL_MOBILE_PRIMARY_ITEMS = PORTAL_NAV_ITEMS.filter((item) =>
  MOBILE_PRIMARY_IDS.has(item.id),
);

export const PORTAL_MOBILE_MORE_ITEMS = PORTAL_NAV_ITEMS.filter(
  (item) => !MOBILE_PRIMARY_IDS.has(item.id),
);
