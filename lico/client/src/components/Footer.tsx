import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <Link to="/rules?tab=terms" className="footer-link">이용약관</Link>
          <span className="footer-divider">|</span>
          <Link to="/rules?tab=privacy" className="footer-link">개인정보처리방침</Link>
          <span className="footer-divider">|</span>
          <Link to="/rules?tab=trading" className="footer-link">거래규칙</Link>
        </div>
        <span className="footer-text">
          Powered by{' '}
          <a
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            TradingView
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
