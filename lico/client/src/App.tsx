import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import TradingPage from './pages/TradingPage';
import DepositWithdrawPage from './pages/DepositWithdrawPage';
import InvestmentHistoryPage from './pages/InvestmentHistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<TradingPage />} />
            <Route path="/trading/:coinSymbol?" element={<TradingPage />} />
            <Route path="/deposit-withdraw" element={<DepositWithdrawPage />} />
            <Route path="/investment-history" element={<InvestmentHistoryPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
