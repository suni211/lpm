import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
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
              to="/wallet-recovery"
              className={'navbar-link ' + (isActive('/wallet-recovery') ? 'active' : '')}
            >
              지갑 복구
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
