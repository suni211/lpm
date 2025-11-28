import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="hero card">
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          리듬 게임에 오신 것을 환영합니다
        </h1>
        <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
          DJMAX 스타일 웹 리듬 게임 - 4K, 5K, 6K, 8K 모드 지원
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/songs">
            <button className="btn">지금 플레이</button>
          </Link>
          <Link to="/rankings">
            <button className="btn btn-secondary">랭킹 보기</button>
          </Link>
        </div>
      </div>

      <div className="features grid grid-3">
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🎮 다양한 모드</h3>
          <p>4K, 5K, 6K, 8K 버튼 레이아웃으로 플레이</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🎵 커스텀 곡</h3>
          <p>자신만의 곡과 비트맵을 업로드</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🏆 글로벌 랭킹</h3>
          <p>전 세계 플레이어와 경쟁</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>⚡ 실시간 판정</h3>
          <p>PERFECT, GREAT, GOOD, BAD, MISS 시스템</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🎬 BGA 지원</h3>
          <p>곡에 맞는 배경 애니메이션</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>📊 통계 추적</h3>
          <p>진행 상황과 실력 향상 기록</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>플레이 방법</h2>
        <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
          <h4>기본 키 설정:</h4>
          <ul style={{ marginTop: '1rem', lineHeight: '2' }}>
            <li><strong>4K 모드:</strong> D, F, J, K</li>
            <li><strong>5K 모드:</strong> D, F, Space, J, K</li>
            <li><strong>6K 모드:</strong> S, D, F, J, K, L</li>
            <li><strong>8K 모드:</strong> A, S, D, F, J, K, L, ;</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
