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
          🚀 CRYP-UP
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
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
