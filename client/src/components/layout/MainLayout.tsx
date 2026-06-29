import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalSearch from '../GlobalSearch';
import { useShortcuts } from '../../hooks/useShortcuts';

export default function MainLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  useShortcuts(() => setIsSearchOpen(true));

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
