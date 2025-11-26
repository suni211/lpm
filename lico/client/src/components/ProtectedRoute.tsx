import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (requireAdmin) {
          await api.get('/auth/admin/me');
          setIsAuthenticated(true);
          setIsAdmin(true);
        } else {
          await api.get('/auth/me');
          setIsAuthenticated(true);
          
          // 설문조사 완료 여부 확인
          try {
            const questionnaireResponse = await api.get('/api/questionnaire/status');
            const isApproved = questionnaireResponse.data.approved;
            if (!isApproved) {
              setNeedsQuestionnaire(true);
            }
          } catch (questionnaireError: any) {
            // 설문조사가 없으면 설문조사 필요
            if (questionnaireError.response?.status === 404) {
              setNeedsQuestionnaire(true);
            }
          }
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

  // 설문조사가 필요하면 설문조사 페이지로 리다이렉트
  if (!requireAdmin && needsQuestionnaire) {
    return <Navigate to="/questionnaire" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

