import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<'admin' | 'dispatcher' | 'viewer'>;
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
