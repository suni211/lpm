import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './QuestionnairePage.css';

const QuestionnairePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    question1_answer: '',
    question2_answer: '',
    question3_answer: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 현재 사용자 정보 가져오기
      const userResponse = await api.get('/api/auth/me');
      const minecraft_username = userResponse.data.user?.minecraft_username;

      if (!minecraft_username) {
        setError('사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.');
        setLoading(false);
        return;
      }

      const response = await api.post('/api/questionnaire/submit', {
        minecraft_username,
        ...formData,
      });

      setResult(response.data);
      
      if (response.data.is_approved) {
        // 승인되면 2초 후 메인 페이지로 이동
        setTimeout(() => {
          window.location.href = '/'; // 페이지 새로고침하여 ProtectedRoute 재확인
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '설문조사 제출에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="questionnaire-page">
        <div className="questionnaire-container">
          <div className="result-card">
            <h1>{result.is_approved ? '✅ 승인되었습니다!' : '⚠️ 승인되지 않았습니다'}</h1>
            <div className="score-display">
              <p>총점: <strong>{result.total_score}/90점</strong></p>
              <p className="result-message">{result.message}</p>
            </div>
            {result.is_approved ? (
              <p className="success-text">잠시 후 메인 페이지로 이동합니다...</p>
            ) : (
              <button 
                className="retry-button"
                onClick={() => {
                  setResult(null);
                  setFormData({ question1_answer: '', question2_answer: '', question3_answer: '' });
                }}
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="questionnaire-page">
      <div className="questionnaire-container">
        <div className="questionnaire-header">
          <h1>LICO 가입 설문조사</h1>
          <p className="subtitle">LICO 거래소 이용을 위해 설문조사를 완료해주세요</p>
          <p className="requirement">총점 90점 이상이면 자동 승인됩니다</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="questionnaire-form">
          <div className="question-group">
            <label className="question-label">
              <span className="question-number">1.</span>
              당신은 계산적이며, 플래닛어스 골드가 많으며, 감당을 할 자신이 있으십니까?
            </label>
            <div className="answer-options">
              <label className="radio-label">
                <input
                  type="radio"
                  name="question1"
                  value="YES"
                  checked={formData.question1_answer === 'YES'}
                  onChange={(e) => setFormData({ ...formData, question1_answer: e.target.value })}
                  required
                />
                <span>예 (10점)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="question1"
                  value="NO"
                  checked={formData.question1_answer === 'NO'}
                  onChange={(e) => setFormData({ ...formData, question1_answer: e.target.value })}
                  required
                />
                <span>아니요 (0점)</span>
              </label>
            </div>
          </div>

          <div className="question-group">
            <label className="question-label">
              <span className="question-number">2.</span>
              당신은 현실 주식에서 성과를 보여줬습니까?
            </label>
            <div className="answer-options">
              <label className="radio-label">
                <input
                  type="radio"
                  name="question2"
                  value="YES"
                  checked={formData.question2_answer === 'YES'}
                  onChange={(e) => setFormData({ ...formData, question2_answer: e.target.value })}
                  required
                />
                <span>예 (50점)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="question2"
                  value="MODERATE"
                  checked={formData.question2_answer === 'MODERATE'}
                  onChange={(e) => setFormData({ ...formData, question2_answer: e.target.value })}
                  required
                />
                <span>보통입니다 (30점)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="question2"
                  value="NO"
                  checked={formData.question2_answer === 'NO'}
                  onChange={(e) => setFormData({ ...formData, question2_answer: e.target.value })}
                  required
                />
                <span>아니요 (0점)</span>
              </label>
            </div>
          </div>

          <div className="question-group">
            <label className="question-label">
              <span className="question-number">3.</span>
              LICO SYSTEM은 블록체인 기술을 도입해, 저희도 건드리지 못합니다.
              코인이 사라질 시, 책임을 온전히 당신이 쥐어집니다. 동의하십니까?
            </label>
            <div className="answer-options">
              <label className="radio-label">
                <input
                  type="radio"
                  name="question3"
                  value="YES"
                  checked={formData.question3_answer === 'YES'}
                  onChange={(e) => setFormData({ ...formData, question3_answer: e.target.value })}
                  required
                />
                <span>예 (30점)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="question3"
                  value="NO"
                  checked={formData.question3_answer === 'NO'}
                  onChange={(e) => setFormData({ ...formData, question3_answer: e.target.value })}
                  required
                />
                <span>아니요 (0점)</span>
              </label>
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? '제출 중...' : '설문조사 제출'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QuestionnairePage;

