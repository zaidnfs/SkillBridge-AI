import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LogOut,
  User as UserIcon,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { KoboyoBrain } from '@/components/icons/Koboyo';
import { BrandLogo } from '@/components/icons/BrandLogo';
import { ReiconTerminal, ReiconRadar, ReiconAtsDoc } from '@/components/icons/Reicon';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: ReiconTerminal },
  { name: 'Job Explorer', href: '/jobs', icon: ReiconRadar },
  { name: 'Resume Analyzer', href: '/resumes', icon: ReiconAtsDoc },
  {
    name: 'AI Mock Interview',
    href: '/interviews',
    icon: KoboyoBrain,
  },
];

export const DesktopSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_pinned', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const isExpanded = isPinned || isHovered;

  return (
    <>
      {/* Structural placeholder so the page layout remains stable */}
      <div
        className={cn(
          'hidden md:block shrink-0 transition-all duration-300 ease-in-out',
          isPinned ? 'w-[260px]' : 'w-[74px]'
        )}
      />

      {/* Sidebar: Deep Forest Emerald Theme */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'hidden md:flex flex-col fixed top-0 left-0 h-screen z-30 select-none border-r border-[#00A264]/35 bg-[#004D2F] text-white transition-all duration-300 ease-in-out',
          isExpanded
            ? 'w-[260px] shadow-[6px_0_30px_rgba(0,35,20,0.22)]'
            : 'w-[74px]'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#00A264]/25">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 font-bold text-base text-white tracking-tight group overflow-hidden"
          >
            <BrandLogo size={36} className="shadow-xs group-hover:scale-105 transition-transform" />

            <div
              className={cn(
                'flex flex-col transition-all duration-200 whitespace-nowrap overflow-hidden',
                isExpanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0 pointer-events-none'
              )}
            >
              <span className="leading-tight flex items-center gap-1 font-bold text-white text-sm">
                SkillBridge <span className="font-mono text-xs text-[#4CD681]">AI</span>
              </span>
              <span className="text-[10px] text-[#D1DDD4]/75 font-mono uppercase tracking-wider">
                Career GraphRAG
              </span>
            </div>
          </NavLink>

          {/* Pin/Unpin Toggle Button (Visible when expanded) */}
          {isExpanded && (
            <button
              type="button"
              onClick={togglePin}
              aria-label={isPinned ? 'Unpin sidebar (hover-only mode)' : 'Pin sidebar permanently'}
              className="h-7 w-7 rounded-lg text-[#D1DDD4] hover:text-white hover:bg-[#008855]/45 flex items-center justify-center transition-colors cursor-pointer"
              title={isPinned ? 'Unpin sidebar (hover-only mode)' : 'Pin sidebar permanently'}
            >
              {isPinned ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {isExpanded && (
            <div className="px-2.5 pb-2 text-[10px] font-semibold text-[#D1DDD4]/65 font-mono uppercase tracking-wider transition-opacity duration-200">
              Platform
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className={cn(
                    'flex items-center rounded-lg text-xs font-medium text-[#D1DDD4]/50 cursor-not-allowed opacity-75 h-10 px-2.5 transition-all',
                    isExpanded ? 'justify-between' : 'justify-center'
                  )}
                  title={!isExpanded ? `${item.name} (Phase 3)` : 'Available in Phase 3'}
                >
                  <div className="flex items-center gap-3 shrink-0">
                    <Icon size={17} strokeWidth={1.75} />
                    {isExpanded && <span className="whitespace-nowrap">{item.name}</span>}
                  </div>
                  {isExpanded && item.badge && (
                    <span className="text-[10px] bg-[#003822] border border-[#00A264]/35 px-1.5 py-0.5 rounded font-mono text-[#D1DDD4] shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                title={!isExpanded ? item.name : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg text-xs font-semibold transition-all h-10 px-2.5',
                    isExpanded ? 'justify-start gap-3' : 'justify-center',
                    isActive
                      ? 'bg-[#008855] text-white border border-[#4CD681]/45 shadow-xs font-bold'
                      : 'text-[#D1DDD4] hover:bg-[#008855]/35 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={cn(
                        'shrink-0 flex items-center justify-center',
                        isActive ? 'text-[#4CD681]' : 'text-current'
                      )}
                    >
                      <Icon size={17} strokeWidth={1.85} />
                    </div>
                    {isExpanded && (
                      <span className="whitespace-nowrap transition-opacity duration-200">
                        {item.name}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & Logout footer */}
        <div className="p-3 border-t border-[#00A264]/25 bg-[#003822]/75">
          <div
            className={cn(
              'flex items-center rounded-xl bg-[#004D2F] border border-[#00A264]/35 shadow-2xs p-2 transition-all',
              isExpanded ? 'justify-between' : 'justify-center'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-8 w-8 rounded-lg bg-[#008855] text-white border border-[#4CD681]/40 flex items-center justify-center font-bold text-xs shrink-0 font-mono"
                title={!isExpanded ? (user?.first_name || user?.email) : undefined}
              >
                {user?.first_name ? user.first_name[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
              </div>

              {isExpanded && (
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="text-xs font-semibold text-white truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}
                  </span>
                  <span className="text-[10px] text-[#D1DDD4]/75 truncate font-mono">
                    {user?.email}
                  </span>
                </div>
              )}
            </div>

            {isExpanded && (
              <button
                type="button"
                onClick={logout}
                aria-label="Log out of account"
                title="Log out"
                className="h-7 w-7 rounded-lg text-[#D1DDD4] hover:text-white hover:bg-red-500/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
