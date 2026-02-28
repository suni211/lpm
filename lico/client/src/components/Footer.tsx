import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
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
