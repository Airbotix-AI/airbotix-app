import { Outlet } from 'react-router-dom';

/**
 * Minimal layout for the teacher class-session surface (`/teacher/*`). The full
 * teacher console lives in a sibling repo; this is the in-app class dashboard +
 * assessment FE (learn-game-studio-prd §17.12 J12). Centered content container,
 * matching the portal/learn layouts.
 */
export function TeacherLayout() {
  return (
    <div className="flex h-full flex-col bg-canvas" data-theme="light">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
