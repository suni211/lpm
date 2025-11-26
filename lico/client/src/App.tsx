import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import TradingPage from './pages/TradingPage';
import DepositWithdrawPage from './pages/DepositWithdrawPage';
import InvestmentHistoryPage from './pages/InvestmentHistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminTradesPage from './pages/AdminTradesPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import QuestionnairePage from './pages/QuestionnairePage';
import WalletCreatedPage from './pages/WalletCreatedPage';
import WalletRecoveryPage from './pages/WalletRecoveryPage';
import ProtectedRoute from './components/ProtectedRoute';
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/questionnaire"
              element={
                <ProtectedRoute skipQuestionnaireCheck>
                  <QuestionnairePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet-created"
              element={
                <ProtectedRoute skipQuestionnaireCheck>
                  <WalletCreatedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet-recovery"
              element={
                <ProtectedRoute>
                  <WalletRecoveryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <TradingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trading/:coinSymbol?"
              element={
                <ProtectedRoute>
                  <TradingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deposit-withdraw"
              element={
                <ProtectedRoute>
                  <DepositWithdrawPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/investment-history"
              element={
                <ProtectedRoute>
                  <InvestmentHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trades"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminTradesPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
