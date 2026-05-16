import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LearnLayout } from './LearnLayout';
import { PortalLayout } from './PortalLayout';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { RootPage } from '@/pages/RootPage';

// Portal pages (parent surface — parent-portal-prd.md §2)
import { ApprovalsPage } from '@/pages/portal/ApprovalsPage';
import { AuditPage } from '@/pages/portal/AuditPage';
import { AuditProjectPage } from '@/pages/portal/AuditProjectPage';
import { BillingPage } from '@/pages/portal/BillingPage';
import { DashboardPage } from '@/pages/portal/DashboardPage';
import { FamilyDetailPage } from '@/pages/portal/FamilyDetailPage';
import { FamilyListPage } from '@/pages/portal/FamilyListPage';
import { FamilyNewPage } from '@/pages/portal/FamilyNewPage';
import { LoginPage as PortalLoginPage } from '@/pages/portal/LoginPage';
import { RegisterPage } from '@/pages/portal/RegisterPage';
import { SettingsPage } from '@/pages/portal/SettingsPage';
import { VerifyOtpPage } from '@/pages/portal/VerifyOtpPage';
import { WalletPage } from '@/pages/portal/WalletPage';
import { WalletTopupPage } from '@/pages/portal/WalletTopupPage';

// Learn pages (kid surface — airbotix-app-learn-prd.md)
import { ClassCodePage } from '@/pages/learn/ClassCodePage';
import { ClassWallPage } from '@/pages/learn/ClassWallPage';
import { HomePage as LearnHomePage } from '@/pages/learn/HomePage';
import { LoginPage as LearnLoginPage } from '@/pages/learn/LoginPage';
import { MissionDetailPage } from '@/pages/learn/MissionDetailPage';
import { MissionsListPage } from '@/pages/learn/MissionsListPage';
import { ProfilePage as LearnProfilePage } from '@/pages/learn/ProfilePage';
import { ProjectDetailPage } from '@/pages/learn/ProjectDetailPage';
import { ProjectNewPage } from '@/pages/learn/ProjectNewPage';
import { ProjectsListPage } from '@/pages/learn/ProjectsListPage';

export const router = createBrowserRouter([
  // Root redirect based on principal kind
  { path: '/', element: <RootPage /> },

  // Portal — parent surface
  { path: '/portal/login', element: <PortalLoginPage /> },
  { path: '/portal/verify-otp', element: <VerifyOtpPage /> },
  { path: '/portal/register', element: <RegisterPage /> },
  {
    path: '/portal',
    element: (
      <ProtectedRoute kind="user">
        <PortalLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'family', element: <FamilyListPage /> },
      { path: 'family/new', element: <FamilyNewPage /> },
      { path: 'family/:kidId', element: <FamilyDetailPage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'wallet/topup', element: <WalletTopupPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'audit/project/:id', element: <AuditProjectPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // Learn — kid surface
  { path: '/learn/login', element: <LearnLoginPage /> },
  { path: '/learn/class-code', element: <ClassCodePage /> },
  {
    path: '/learn',
    element: (
      <ProtectedRoute kind="kid">
        <LearnLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <LearnHomePage /> },
      { path: 'projects', element: <ProjectsListPage /> },
      { path: 'projects/new', element: <ProjectNewPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'missions', element: <MissionsListPage /> },
      { path: 'missions/:id', element: <MissionDetailPage /> },
      { path: 'wall', element: <ClassWallPage /> },
      { path: 'profile', element: <LearnProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
