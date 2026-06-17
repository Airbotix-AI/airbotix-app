import { Navigate, createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LearnLayout } from './LearnLayout';
import { PortalLayout } from './PortalLayout';
import { TeacherLayout } from './TeacherLayout';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { RootPage } from '@/pages/RootPage';

// The Phaser game studio. `/learn/playground/:projectId` (LearnPlaygroundPage)
// is the authed kid entry the Tiny Game card opens; `/learn/playground/new`
// drives the create/landing flow. Phase 1 runs on the local scaffold (no backend
// `game` kind yet — see LearnPlaygroundPage).
import { LearnPlaygroundPage } from '@/pages/learn/playground/LearnPlaygroundPage';

// Portal pages (parent surface — parent-portal-prd.md §2)
import { ApprovalsPage } from '@/pages/portal/ApprovalsPage';
import { AuditPage } from '@/pages/portal/AuditPage';
import { AuditProjectPage } from '@/pages/portal/AuditProjectPage';
import { BillingPage } from '@/pages/portal/BillingPage';
import { CoursesPage } from '@/pages/portal/CoursesPage';
import { DashboardPage } from '@/pages/portal/DashboardPage';
import { FamilyDetailPage } from '@/pages/portal/FamilyDetailPage';
import { FamilyListPage } from '@/pages/portal/FamilyListPage';
import { KidGrowthPage } from '@/pages/portal/KidGrowthPage';
import { FamilyNewPage } from '@/pages/portal/FamilyNewPage';
import { LoginPage as PortalLoginPage } from '@/pages/portal/LoginPage';
import { RegisterPage } from '@/pages/portal/RegisterPage';
import { SettingsPage } from '@/pages/portal/SettingsPage';
import { TutoringPage } from '@/pages/portal/TutoringPage';
import { VerifyOtpPage } from '@/pages/portal/VerifyOtpPage';
import { WalletPage } from '@/pages/portal/WalletPage';
import { WalletTopupPage } from '@/pages/portal/WalletTopupPage';
import { WalletAutoTopupPage } from '@/pages/portal/WalletAutoTopupPage';
import { UsagePage } from '@/pages/portal/UsagePage';
import { KidUsagePage } from '@/pages/portal/KidUsagePage';

// Learn pages (kid surface — airbotix-app-learn-prd.md)
import { ClassCodePage } from '@/pages/learn/ClassCodePage';
import { HomePage as LearnHomePage } from '@/pages/learn/HomePage';
import { LoginPage as LearnLoginPage } from '@/pages/learn/LoginPage';
import { LessonsCatalogPage } from '@/pages/learn/LessonsCatalogPage';
import { PackLessonsPage } from '@/pages/learn/PackLessonsPage';
import { ProfilePage as LearnProfilePage } from '@/pages/learn/ProfilePage';
import { ProjectDetailPage } from '@/pages/learn/ProjectDetailPage';
import { ProjectNewPage } from '@/pages/learn/ProjectNewPage';
import { ProjectsListPage } from '@/pages/learn/ProjectsListPage';
import { CreateHubPage } from '@/pages/learn/create/CreateHubPage';
import { CodeHubPage } from '@/pages/learn/code/CodeHubPage';
import { BlocksHubPage } from '@/pages/learn/blocks/BlocksHubPage';
import { BlocksStudioPage } from '@/pages/learn/blocks/BlocksStudioPage';
import { CodeStudioPage } from '@/pages/learn/code/CodeStudioPage';
import { CodeRunPage } from '@/pages/learn/code/CodeRunPage';
import { ClassroomListPage } from '@/pages/learn/classroom/ClassroomListPage';
import { ClassHubPage } from '@/pages/learn/classroom/ClassHubPage';
import { ClassGamesWallPage } from '@/pages/learn/classroom/ClassGamesWallPage';
import { ClassPostPage } from '@/pages/learn/classroom/ClassPostPage';
import { WorkspacePage } from '@/pages/learn/workspace/WorkspacePage';
// Teacher class-session surface (learn-game-studio-prd §17.12 J12). Teacher is a
// `user` principal (role=teacher); the full console lives in a sibling repo —
// this is the in-app class dashboard + live view + assessment FE.
import { ClassDashboardPage } from '@/pages/teacher/ClassDashboardPage';
import { LiveViewPage } from '@/pages/teacher/LiveViewPage';
import { AssessmentPage } from '@/pages/teacher/AssessmentPage';
import { ImageMakerPage } from '@/pages/learn/create/ImageMakerPage';
import { MusicMakerPage } from '@/pages/learn/create/MusicMakerPage';
import { VoiceBoothPage } from '@/pages/learn/create/VoiceBoothPage';
import { VideoStudioPage } from '@/pages/learn/create/VideoStudioPage';

// PUBLIC, no-auth play host for an external share-link (learn-game-studio-prd
// §17.8 J8 / D-GAME10). Renders ONLY the bare game canvas (no editor/chat/console/
// Game-Runner chrome), no auth token, no LLM — the opaque-origin sandbox only.
import { PublicPlayPage } from '@/pages/play/PublicPlayPage';

// PUBLIC, no-auth "Try it" demos (try-demo-mode-prd.md §2 D-DEMO-01). They render
// the REAL studios wrapped in the demo provider (in-memory state, scripted AI,
// tour overlay) — like /play/:shareId, deliberately NOT under <ProtectedRoute>.
import { TryBlocksPage } from '@/pages/try/TryBlocksPage';
import { TryPlaygroundPage } from '@/pages/try/TryPlaygroundPage';

export const router = createBrowserRouter([
  // Root redirect based on principal kind
  { path: '/', element: <RootPage /> },

  // PUBLIC external share-link play route — NO auth, NO layout, NO studio chrome.
  // A logged-out visitor (e.g. grandma) opens /play/:shareId and plays the kid's
  // frozen, read-only game snapshot. Deliberately NOT under any <ProtectedRoute>.
  { path: '/play/:shareId', element: <PublicPlayPage /> },

  // PUBLIC no-signup demo experiences (try-demo-mode-prd.md §1 T1/T2) — the
  // marketing site's "Try it free" entry points. No token, no redirect.
  { path: '/try/playground', element: <TryPlaygroundPage /> },
  { path: '/try/blocks', element: <TryBlocksPage /> },

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
      { path: 'courses', element: <CoursesPage /> },
      { path: 'family', element: <FamilyListPage /> },
      { path: 'family/new', element: <FamilyNewPage /> },
      { path: 'family/:kidId', element: <KidGrowthPage /> },
      { path: 'family/:kidId/settings', element: <FamilyDetailPage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'wallet/topup', element: <WalletTopupPage /> },
      { path: 'wallet/auto-topup', element: <WalletAutoTopupPage /> },
      { path: 'tutoring', element: <TutoringPage /> },
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

  // Teacher — class-session surface (kind="user", role=teacher). Class dashboard
  // + per-kid live read-only view + assessment (learn-game-studio-prd §17.12 J12).
  {
    path: '/teacher',
    element: (
      <ProtectedRoute kind="user">
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'classes/:classId', element: <ClassDashboardPage /> },
      { path: 'classes/:classId/kids/:kidId', element: <LiveViewPage /> },
      { path: 'classes/:classId/kids/:kidId/assessment', element: <AssessmentPage /> },
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
      // Internal route id stays `/learn/missions` (D-LP-2); the catalog & detail
      // pages render the pack's Lessons (课节) → each Lesson's Mission tasks.
      { path: 'missions', element: <LessonsCatalogPage /> },
      { path: 'missions/:id', element: <PackLessonsPage /> },
      // Legacy alias: the class wall is `/learn/classroom` (ClassroomListPage).
      // The old `/learn/wall` was a "Coming soon" placeholder — redirect it.
      { path: 'wall', element: <Navigate to="/learn/classroom" replace /> },
      { path: 'classroom', element: <ClassroomListPage /> },
      { path: 'classroom/:classId', element: <ClassHubPage /> },
      { path: 'classroom/:classId/games', element: <ClassGamesWallPage /> },
      { path: 'classroom/:classId/post/:projectId', element: <ClassPostPage /> },
      { path: 'profile', element: <LearnProfilePage /> },
      { path: 'create', element: <CreateHubPage /> },
      { path: 'create/image', element: <ImageMakerPage /> },
      { path: 'create/music', element: <MusicMakerPage /> },
      { path: 'create/voice', element: <VoiceBoothPage /> },
      { path: 'create/video', element: <VideoStudioPage /> },
      { path: 'create/code', element: <CodeHubPage /> },
      // Blocks Studio (junior block coder, learn-blocks-studio-prd.md §2)
      { path: 'create/blocks', element: <BlocksHubPage /> },
      { path: 'blocks/:projectId', element: <BlocksStudioPage /> },
      { path: 'code/:projectId', element: <CodeStudioPage /> },
      { path: 'code/:projectId/run', element: <CodeRunPage /> },
      // Game studio (Phaser). A /learn child so it keeps the Learn top nav; full
      // -bleed via FLUID_ROUTES in LearnLayout. The Tiny Game card routes here.
      // Phase 1: local Phaser scaffold (no backend game kind yet). This authed
      // route is the only entry — `/learn/playground/:projectId` opens a game and
      // `/learn/playground/new` drives the create/landing flow. (Dev/e2e testing
      // uses a route-mocked authed harness, not a separate no-auth route.)
      { path: 'playground/:projectId', element: <LearnPlaygroundPage /> },
      { path: 'workspace', element: <WorkspacePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
