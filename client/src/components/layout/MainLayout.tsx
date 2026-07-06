import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import GlobalSearch from '../GlobalSearch';
import { useShortcuts } from '../../hooks/useShortcuts';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  useShortcuts(() => setIsSearchOpen(true));

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white border border-surface-200 shadow-sm hover:bg-surface-50 transition-colors"
            title="Buka sidebar"
          >
            <Menu className="w-5 h-5 text-surface-700" />
          </button>
        )}
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
