import { Outlet } from 'react-router-dom';

import { LearnTopBar } from './LearnTopBar';

export function LearnLayout() {
  return (
    <div className="flex h-full flex-col">
      <LearnTopBar />
      <main className="flex-1 overflow-y-auto bg-cream p-6">
        <Outlet />
      </main>
    </div>
  );
}
