import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import './Login.css';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await auth.login({ username, password });
      } else {
        await auth.register({ username, email, password, display_name: displayName });
      }
      navigate('/home');
    } catch (error: any) {
      setError(error.response?.data?.error || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-particles"></div>
      </div>
      
      <div className="login-card fade-in">
        <div className="login-header">
          <h1 className="login-title">
            <span className="title-cyber">BERRPLE</span>
            <span className="title-rhythm">RHYTHM</span>
          </h1>
          <p className="login-subtitle">리듬 게임의 새로운 경험</p>
        </div>

        {error && (
          <div className="error-message slide-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="사용자명"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="login-input"
            />
          </div>

          {!isLogin && (
            <>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                />
              </div>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="표시 이름"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="login-input"
                />
              </div>
            </>
          )}

          <div className="input-group">
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              isLogin ? '로그인' : '회원가입'
            )}
          </button>
        </form>

        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }} 
          className="toggle-button"
        >
          {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </div>
    </div>
  );
};

export default Login;
