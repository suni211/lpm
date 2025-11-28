export default function ProfilePage({ user }: { user: any }) {
  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>프로필을 보려면 로그인하세요</h2>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1 style={{ marginBottom: '2rem' }}>프로필</h1>

      <div className="card">
        <h2>{user.displayName}</h2>
        <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>@{user.username}</p>
        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>{user.email}</p>

        <div className="grid grid-3" style={{ marginTop: '2rem' }}>
          <div>
            <h4 style={{ opacity: 0.7 }}>레벨</h4>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{user.level}</p>
          </div>
          <div>
            <h4 style={{ opacity: 0.7 }}>총 점수</h4>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {user.totalScore?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <h4 style={{ opacity: 0.7 }}>총 플레이</h4>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{user.totalPlays || 0}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <h3>더 많은 기능이 곧 추가됩니다!</h3>
        <p style={{ opacity: 0.8, marginTop: '1rem' }}>
          최고 기록, 최근 플레이, 통계가 여기에 표시됩니다.
        </p>
      </div>
    </div>
  );
}
