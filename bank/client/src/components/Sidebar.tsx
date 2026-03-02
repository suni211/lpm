import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  userData: {
    minecraft_username: string;
    account_number?: string;
  } | null;
}

function Sidebar({ userData }: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: '🏠', label: '대시보드' },
    { path: '/create-account', icon: '➕', label: '계좌 개설' },
    { path: '/banking', icon: '💳', label: '입출금 및 이체' },
    { path: '/auto-transfers', icon: '🔄', label: '자동 이체' },
    { path: '/scheduled-transfers', icon: '📅', label: '예약 이체' },
    { path: '/budgets', icon: '💰', label: '예산 관리' },
    { path: '/savings-goals', icon: '🎯', label: '목표 저축' },
    { path: '/lico-connection', icon: '📈', label: 'Lico 연동' },
    { path: '/stats', icon: '📊', label: '통계 및 분석' },
    { path: '/transactions', icon: '📋', label: '거래 내역' },
    { path: '/rules', icon: '📜', label: '이용규칙' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-container">
          <img 
            src="/cryptbank-logo.png" 
            alt="CRYPBANK" 
            className="sidebar-logo"
            onError={(e) => {
              // 로고가 없으면 텍스트로 대체
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'block';
              }
            }}
          />
          <h2 style={{ display: 'none' }}>🏦 CRYPBANK</h2>
        </div>
        {userData && (
          <p className="sidebar-user">
            {userData.minecraft_username}
            {userData.account_number && (
              <span className="sidebar-account">{userData.account_number}</span>
            )}
          </p>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-help">💡 도움이 필요하신가요?</p>
        <p className="sidebar-version">v1.0.0</p>
      </div>
    </div>
  );
}

export default Sidebar;

