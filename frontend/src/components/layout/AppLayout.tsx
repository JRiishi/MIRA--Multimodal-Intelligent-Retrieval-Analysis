import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Folder, Image as ImageIcon, Search, AlertCircle, FileBarChart2 } from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: Folder },
  { name: 'Media', to: '/media', icon: ImageIcon },
  { name: 'Search', to: '/search', icon: Search },
  { name: 'Reports', to: '/reports', icon: FileBarChart2 },
  { name: 'Needs Review', to: '/review', icon: AlertCircle },
];

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-sm"></div>
            <span className="font-semibold text-gray-900 tracking-tight">Code Cubicle</span>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
