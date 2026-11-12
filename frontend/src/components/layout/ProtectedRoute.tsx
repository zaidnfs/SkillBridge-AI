import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#F3F5F4] text-[#0A1A12]">
        <div className="mb-6 flex items-center justify-center">
          <AIThinkingOrb state="connecting" size={110} color="#008855" dotSize={1.4} />
        </div>
        <div className="space-y-2 text-center max-w-sm">
          <h3 className="text-lg font-bold text-[#0A1A12] tracking-tight">
            Connecting CareerGraph AI
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Validating credentials and restoring your placement workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#F3F5F4]">
        <AIThinkingOrb state="working" size={32} color="#008855" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
