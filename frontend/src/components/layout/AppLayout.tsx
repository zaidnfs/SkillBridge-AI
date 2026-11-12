import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/icons/BrandLogo';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-[#F3F5F4] text-[#0A1A12] font-sans antialiased selection:bg-[#008855]/20 selection:text-[#004D2F]">
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#008855] focus:text-white focus:font-medium focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Desktop & Tablet Sidebar */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Mobile Header (visible only on small screens) */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-[#E2E8E5] bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-base text-[#004D2F]">
            <BrandLogo size={28} className="shadow-xs" />
            <span>
              SkillBridge <span className="font-mono text-xs text-[#008855]">AI</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-neutral-600 font-medium">
              {user?.first_name || user?.email?.split('@')[0]}
            </span>
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 md:p-8 max-w-[1240px] w-full mx-auto animate-in fade-in-50 duration-300 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
