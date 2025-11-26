import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import RegisterPage from './pages/RegisterPage';
import RecoveryPage from './pages/RecoveryPage';
import DashboardPage from './pages/DashboardPage';
import CreateAccountPage from './pages/CreateAccountPage';
import BankingPage from './pages/BankingPage';
import AutoTransfersPage from './pages/AutoTransfersPage';
import ScheduledTransfersPage from './pages/ScheduledTransfersPage';
import BudgetsPage from './pages/BudgetsPage';
import SavingsGoalsPage from './pages/SavingsGoalsPage';
import LicoConnectionPage from './pages/LicoConnectionPage';
import StatsPage from './pages/StatsPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminDepositsPage from './pages/AdminDepositsPage';
import AdminWithdrawalsPage from './pages/AdminWithdrawalsPage';
import AdminTransfersPage from './pages/AdminTransfersPage';
import AdminAccountsPage from './pages/AdminAccountsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminTransactionsPage from './pages/AdminTransactionsPage';
import NotificationBell from './components/NotificationBell';
import api from './services/api';
import './App.css';
import './styles/animations.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user) {
        setIsAuthenticated(true);
        setUserData(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <Router>
      <div className="app">
        {isAuthenticated && userData && (
          <div className="notification-bell-wrapper">
            <NotificationBell />
          </div>
        )}
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage setAuth={setIsAuthenticated} />
          } />
          <Route path="/admin-login" element={<AdminLoginPage setAuth={setIsAuthenticated} />} />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />
          } />
          <Route path="/recovery" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <RecoveryPage />
          } />
          <Route path="/dashboard" element={
            isAuthenticated ? <DashboardPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/create-account" element={
            isAuthenticated ? <CreateAccountPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/banking" element={
            isAuthenticated ? <BankingPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/auto-transfers" element={
            isAuthenticated ? <AutoTransfersPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/scheduled-transfers" element={
            isAuthenticated ? <ScheduledTransfersPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/budgets" element={
            isAuthenticated ? <BudgetsPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/savings-goals" element={
            isAuthenticated ? <SavingsGoalsPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/lico-connection" element={
            isAuthenticated ? <LicoConnectionPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/stats" element={
            isAuthenticated ? <StatsPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/transactions" element={
            isAuthenticated ? <TransactionsPage userData={userData} setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
          } />
          <Route path="/admin" element={<AdminDashboardPage setAuth={setIsAuthenticated} />} />
          <Route path="/admin/deposits" element={<AdminDepositsPage setAuth={setIsAuthenticated} />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage setAuth={setIsAuthenticated} />} />
          <Route path="/admin/transfers" element={<AdminTransfersPage setAuth={setIsAuthenticated} />} />
          <Route path="/admin/accounts" element={<AdminAccountsPage setAuth={setIsAuthenticated} />} />
          <Route path="/admin/users" element={<AdminUsersPage setAuth={setIsAuthenticated} />} />
          <Route path="/admin/transactions" element={<AdminTransactionsPage setAuth={setIsAuthenticated} />} />
          <Route path="/deposit" element={<Navigate to="/banking" />} />
          <Route path="/withdraw" element={<Navigate to="/banking" />} />
          <Route path="/transfer" element={<Navigate to="/banking" />} />
          <Route path="/account" element={<Navigate to="/dashboard" />} />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
