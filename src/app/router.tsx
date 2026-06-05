import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LearnLayout } from './LearnLayout';
import { PortalLayout } from './PortalLayout';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { RootPage } from '@/pages/RootPage';

// DEV-ONLY: sandboxed Phaser runtime proof harness (no auth). See GameSandboxDevPage.
import { GameSandboxDevPage } from '@/pages/learn/playground/GameSandboxDevPage';

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
import { WalletAutoTopupPage } from '@/pages/portal/WalletAutoTopupPage';
import { UsagePage } from '@/pages/portal/UsagePage';
import { KidUsagePage } from '@/pages/portal/KidUsagePage';

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
import { CreateHubPage } from '@/pages/learn/create/CreateHubPage';
import { CodeHubPage } from '@/pages/learn/code/CodeHubPage';
import { CodeStudioPage } from '@/pages/learn/code/CodeStudioPage';
import { CodeRunPage } from '@/pages/learn/code/CodeRunPage';
import { ClassroomListPage } from '@/pages/learn/classroom/ClassroomListPage';
import { ClassWallViewPage } from '@/pages/learn/classroom/ClassWallViewPage';
import { ClassPostPage } from '@/pages/learn/classroom/ClassPostPage';
import { WorkspacePage } from '@/pages/learn/workspace/WorkspacePage';
import { ImageMakerPage } from '@/pages/learn/create/ImageMakerPage';
import { MusicMakerPage } from '@/pages/learn/create/MusicMakerPage';
import { VoiceBoothPage } from '@/pages/learn/create/VoiceBoothPage';
import { VideoStudioPage } from '@/pages/learn/create/VideoStudioPage';

export const router = createBrowserRouter([
  // Root redirect based on principal kind
  { path: '/', element: <RootPage /> },

  // DEV-ONLY: view the Phaser sandbox without auth. Stripped from prod builds.
  ...(import.meta.env.DEV ? [{ path: '/playground-sandbox', element: <GameSandboxDevPage /> }] : []),

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
      { path: 'wallet/auto-topup', element: <WalletAutoTopupPage /> },
      { path: 'usage', element: <UsagePage /> },
      { path: 'usage/:kidId', element: <KidUsagePage /> },
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
      { path: 'classroom', element: <ClassroomListPage /> },
      { path: 'classroom/:classId', element: <ClassWallViewPage /> },
      { path: 'classroom/:classId/post/:projectId', element: <ClassPostPage /> },
      { path: 'profile', element: <LearnProfilePage /> },
      { path: 'create', element: <CreateHubPage /> },
      { path: 'create/image', element: <ImageMakerPage /> },
      { path: 'create/music', element: <MusicMakerPage /> },
      { path: 'create/voice', element: <VoiceBoothPage /> },
      { path: 'create/video', element: <VideoStudioPage /> },
      { path: 'create/code', element: <CodeHubPage /> },
      { path: 'code/:projectId', element: <CodeStudioPage /> },
      { path: 'code/:projectId/run', element: <CodeRunPage /> },
      { path: 'workspace', element: <WorkspacePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
