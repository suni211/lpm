import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const [ckIndex, setCkIndex] = useState<{ value: number; change: number } | null>(null);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // CK 지수 30초마다 폴링
  useEffect(() => {
    const fetchCKIndex = async () => {
      try {
        const response = await api.get('/indicators/ck-index');
        setCkIndex(response.data);
      } catch (error) {
        // 무시 - 지수 표시 안 됨
      }
    };

    fetchCKIndex();
    const interval = setInterval(fetchCKIndex, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <img
              src="/cryptup-logo.png"
              alt="LICO"
              className="navbar-logo-img"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display = 'inline';
                }
              }}
            />
            <span style={{ display: 'none' }}>LICO</span>
          </Link>
          {ckIndex && (
            <div className="ck-index-display">
              <span className="ck-index-label">CK</span>
              <span className="ck-index-value">
                {typeof ckIndex.value === 'number' ? ckIndex.value.toFixed(2) : parseFloat(ckIndex.value).toFixed(2)}
              </span>
              <span className={`ck-index-change ${(typeof ckIndex.change === 'number' ? ckIndex.change : parseFloat(ckIndex.change)) >= 0 ? 'positive' : 'negative'}`}>
                {(typeof ckIndex.change === 'number' ? ckIndex.change : parseFloat(ckIndex.change)) >= 0 ? '+' : ''}
                {(typeof ckIndex.change === 'number' ? ckIndex.change : parseFloat(ckIndex.change)).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <ul className="navbar-menu">
          <li>
            <Link
              to="/trading"
              className={'navbar-link ' + (isActive('/trading') || location.pathname === '/' ? 'active' : '')}
            >
              거래소
            </Link>
          </li>
          <li>
            <Link
              to="/deposit-withdraw"
              className={'navbar-link ' + (isActive('/deposit-withdraw') ? 'active' : '')}
            >
              입출금
            </Link>
          </li>
          <li>
            <Link
              to="/investment-history"
              className={'navbar-link ' + (isActive('/investment-history') ? 'active' : '')}
            >
              투자내역
            </Link>
          </li>
          <li>
            <Link
              to="/news"
              className={'navbar-link ' + (isActive('/news') ? 'active' : '')}
            >
              뉴스
            </Link>
          </li>
          <li>
            <Link
              to="/rules"
              className={'navbar-link ' + (isActive('/rules') ? 'active' : '')}
            >
              이용규칙
            </Link>
          </li>
          <li>
            <Link
              to="/admin"
              className={'navbar-link ' + (isActive('/admin') ? 'active' : '')}
            >
              관리자
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
