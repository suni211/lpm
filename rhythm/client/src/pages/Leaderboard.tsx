import React, { useEffect, useState } from 'react';
import { scores } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Leaderboard: React.FC = () => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const res = await scores.getRanking({ limit: 100 });
      setRankings(res.data.rankings);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load rankings', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '100px' }}>Loading...</div>;
  }

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      <button onClick={() => navigate('/home')} style={{ marginBottom: '20px', padding: '10px 20px', background: '#666', border: 'none', color: '#fff', cursor: 'pointer' }}>
        Back
      </button>
      <h1>Global Leaderboard</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ background: '#1a1a1a' }}>
            <th style={{ padding: '15px', textAlign: 'left' }}>Rank</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Player</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Tier</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Rating</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Total Score</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Plays</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((player, index) => (
            <tr key={player.id} style={{ background: index % 2 === 0 ? '#0a0a0a' : '#111' }}>
              <td style={{ padding: '15px' }}>#{index + 1}</td>
              <td style={{ padding: '15px' }}>{player.display_name}</td>
              <td style={{ padding: '15px' }}>{player.tier}</td>
              <td style={{ padding: '15px', textAlign: 'right' }}>{player.rating}</td>
              <td style={{ padding: '15px', textAlign: 'right' }}>{player.total_score.toLocaleString()}</td>
              <td style={{ padding: '15px', textAlign: 'right' }}>{player.total_plays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
