import { Outlet } from 'react-router-dom';

import { LearnTopBar } from './LearnTopBar';

export function LearnLayout() {
  return (
    <div className="flex h-full flex-col bg-canvas">
      <LearnTopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
