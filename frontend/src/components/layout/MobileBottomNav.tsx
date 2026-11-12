import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ReiconTerminal, ReiconRadar, ReiconAtsDoc } from '@/components/icons/Reicon';
import { KoboyoBrain } from '@/components/icons/Koboyo';

export const MobileBottomNav: React.FC = () => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#004D2F]/95 backdrop-blur-md border-t border-[#00A264]/35 z-40 px-4 flex items-center justify-around safe-bottom shadow-lg shadow-black/15"
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2.5 text-[11px] font-medium transition-colors',
            isActive ? 'text-[#4CD681] font-bold' : 'text-[#D1DDD4] hover:text-white'
          )
        }
      >
        <ReiconTerminal size={19} strokeWidth={1.75} className="mb-0.5" />
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="/jobs"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2.5 text-[11px] font-medium transition-colors',
            isActive ? 'text-[#4CD681] font-bold' : 'text-[#D1DDD4] hover:text-white'
          )
        }
      >
        <ReiconRadar size={19} strokeWidth={1.75} className="mb-0.5" />
        <span>Jobs</span>
      </NavLink>

      <NavLink
        to="/resumes"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2.5 text-[11px] font-medium transition-colors',
            isActive ? 'text-[#4CD681] font-bold' : 'text-[#D1DDD4] hover:text-white'
          )
        }
      >
        <ReiconAtsDoc size={19} strokeWidth={1.75} className="mb-0.5" />
        <span>Resume</span>
      </NavLink>

      <NavLink
        to="/interviews"
        className={({ isActive }) =>
          cn(
            'flex flex-col items-center justify-center py-1 px-2.5 text-[11px] font-medium transition-colors',
            isActive ? 'text-[#4CD681] font-bold' : 'text-[#D1DDD4] hover:text-white'
          )
        }
      >
        <KoboyoBrain size={19} strokeWidth={1.75} className="mb-0.5" />
        <span>Interview</span>
      </NavLink>
    </nav>
  );
};
