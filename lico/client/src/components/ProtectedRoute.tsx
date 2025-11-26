import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import NoWalletPage from '../pages/NoWalletPage';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  skipQuestionnaireCheck?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false, skipQuestionnaireCheck = false }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (requireAdmin) {
          await api.get('/auth/admin/me');
          setIsAuthenticated(true);
          setIsAdmin(true);
        } else {
          const meResponse = await api.get('/auth/me');
          setIsAuthenticated(true);
          
          // 지갑 존재 여부 확인
          const user = meResponse.data.user;
          if (user && user.wallet_address === null && !user.requires_questionnaire) {
            // 설문조사는 완료했지만 지갑이 없는 경우 (이론적으로 발생하지 않지만 안전장치)
            setHasWallet(false);
          } else if (user && user.wallet_address) {
            setHasWallet(true);
          }
          
          // 설문조사 완료 여부 확인 (skipQuestionnaireCheck가 false일 때만)
          if (!skipQuestionnaireCheck) {
            try {
              const questionnaireResponse = await api.get('/questionnaire/status');
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
        }
      } catch (error) {
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [requireAdmin, skipQuestionnaireCheck]);

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

  // 설문조사가 필요하면 설문조사 페이지로 리다이렉트 (skipQuestionnaireCheck가 false일 때만)
  if (!requireAdmin && !skipQuestionnaireCheck && needsQuestionnaire) {
    return <Navigate to="/questionnaire" replace />;
  }

  // 지갑이 없으면 안내 페이지 표시 (설문조사는 완료했지만 지갑이 없는 경우)
  if (!requireAdmin && hasWallet === false && !needsQuestionnaire) {
    return <NoWalletPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

