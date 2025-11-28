import { useState, useEffect } from 'react';
import { rankingsAPI } from '../api/client';
import type { RankingEntry } from '../types';

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const response = await rankingsAPI.getGlobal({ limit: 50 });
      setRankings(response.data);
    } catch (error) {
      console.error('랭킹 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="card"><h2>랭킹 로딩 중...</h2></div>;
  }

  return (
    <div className="rankings-page">
      <h1 style={{ marginBottom: '2rem' }}>글로벌 랭킹</h1>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>순위</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>플레이어</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>레벨</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>총 점수</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>플레이 수</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>평균 정확도</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((entry, index) => (
              <tr
                key={entry.id || index}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  background: index < 3 ? 'rgba(255,215,0,0.1)' : 'transparent'
                }}
              >
                <td style={{ padding: '1rem' }}>
                  {index + 1 === 1 && '🥇'}
                  {index + 1 === 2 && '🥈'}
                  {index + 1 === 3 && '🥉'}
                  {index + 1 > 3 && `#${index + 1}`}
                </td>
                <td style={{ padding: '1rem' }}>
                  <strong>{entry.display_name || entry.username}</strong>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {entry.level || 1}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {(entry.total_score || 0).toLocaleString()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {0}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {entry.accuracy ? `${entry.accuracy.toFixed(2)}%` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rankings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
            아직 랭킹이 없습니다. 첫 번째로 플레이하세요!
          </div>
        )}
      </div>
    </div>
  );
}
