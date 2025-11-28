import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.register(formData);
      alert('회원가입 성공! 로그인해주세요.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || '회원가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>회원가입</h1>

        {error && (
          <div style={{
            background: 'rgba(255,107,107,0.2)',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            border: '1px solid rgba(255,107,107,0.5)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사용자명</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="사용자명을 선택하세요"
            />
          </div>

          <div className="form-group">
            <label>닉네임</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              placeholder="표시될 이름"
            />
          </div>

          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="강력한 비밀번호를 선택하세요"
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? '계정 생성 중...' : '회원가입'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.8 }}>
            이미 계정이 있으신가요? <a href="/login" style={{ color: '#ffd700' }}>로그인</a>
          </p>
        </form>
      </div>
    </div>
  );
}
