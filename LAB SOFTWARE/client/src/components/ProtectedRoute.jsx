import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-navy-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-coral-500 border-t-transparent"></div>
          <p className="text-sm font-semibold text-navy-500 dark:text-navy-400">Loading Jyothi Lab Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-full bg-rose-100 p-4 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Access Denied</h1>
        <p className="max-w-md text-navy-500 dark:text-navy-400">
          Your account role ({user.role}) is not authorized to view this page. Please contact the administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
