import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (requireAdmin) {
          const response = await api.get('/auth/admin/me');
          setIsAuthenticated(true);
          setIsAdmin(true);
        } else {
          const response = await api.get('/auth/me');
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [requireAdmin]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

