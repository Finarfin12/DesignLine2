import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Archive, Palette, Package,
  Mail, Settings, LogOut, Users, Moon, Sun, Calendar, Pipette, LayoutGrid, Lightbulb, PanelLeftClose
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen,      label: 'Projects' },
  { to: '/timeline', icon: Calendar,        label: 'Timeline' },
  { to: '/archive',  icon: Archive,         label: 'Archive' },
  { to: '/brands',   icon: Palette,         label: 'Brand Library' },
  { to: '/clients',  icon: Users,           label: 'Clients' },
  { to: '/assets',   icon: Package,         label: 'Assets' },
  { to: '/moodboard',icon: LayoutGrid,      label: 'Moodboard' },
  { to: '/ideate',   icon: Lightbulb,       label: 'Ideate' },
  { to: '/tools/palette', icon: Pipette,    label: 'Color Palette' },
  { to: '/email',    icon: Mail,            label: 'Email' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-0'} flex-shrink-0 bg-white border-r border-surface-200 flex flex-col h-screen sticky top-0 overflow-hidden transition-all duration-200`}>
      {/* Logo + Close */}
      <div className="px-6 py-6 border-b border-surface-200 flex items-center justify-between min-w-64">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-bold text-lg text-surface-900 leading-tight">Design Line</span>
            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold">Workflow Hub</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors"
          title="Tutup sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto min-w-64">
        <p className="px-3 mb-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Modul</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isActive ? 'nav-item-active' : 'nav-item-inactive'
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Settings + User */}
      <div className="px-4 pb-6 border-t border-surface-200 pt-4 space-y-1 min-w-64">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? 'nav-item-active' : 'nav-item-inactive'
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span>Settings</span>
        </NavLink>
        <button onClick={toggleDark} className="nav-item-inactive w-full text-left">
          {isDark ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button onClick={handleLogout} className="nav-item-inactive w-full text-left">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>

        {/* User info */}
        <div className="mt-4 px-3 py-3 rounded-xl bg-surface-50 border border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-surface-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-surface-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
