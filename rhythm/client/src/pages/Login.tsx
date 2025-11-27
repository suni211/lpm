import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await auth.login({ username, password });
      } else {
        await auth.register({ username, email, password, display_name: displayName });
      }
      navigate('/home');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error occurred');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' }}>
      <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '10px', width: '400px' }}>
        <h1 style={{ color: '#fff', textAlign: 'center' }}>Berrple Rhythm</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '10px', margin: '10px 0', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
          />
          {!isLogin && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', margin: '10px 0', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ width: '100%', padding: '10px', margin: '10px 0', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
            </>
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px', margin: '10px 0', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '10px', margin: '10px 0', background: '#00ffff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#00ffff', border: 'none', cursor: 'pointer' }}>
          {isLogin ? 'Create Account' : 'Back to Login'}
        </button>
      </div>
    </div>
  );
};

export default Login;
