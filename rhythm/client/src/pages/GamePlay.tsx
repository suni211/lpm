import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import { beatmaps, scores } from '../services/api';
import { Beatmap } from '../types';

const GamePlay: React.FC = () => {
  const { beatmapId } = useParams<{ beatmapId: string }>();
  const navigate = useNavigate();
  const [beatmap, setBeatmap] = useState<Beatmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBeatmap();
  }, [beatmapId]);

  const loadBeatmap = async () => {
    try {
      const res = await beatmaps.getOne(Number(beatmapId));
      setBeatmap(res.data.beatmap);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load beatmap', error);
      navigate('/home');
    }
  };

  const handleGameEnd = async (results: any) => {
    try {
      await scores.submit({
        beatmap_id: Number(beatmapId),
        score: results.score,
        accuracy: results.accuracy,
        max_combo: results.maxCombo,
        count_yas: results.judgements.yas,
        count_oh: results.judgements.oh,
        count_ah: results.judgements.ah,
        count_fuck: results.judgements.fuck
      });

      alert(`Game Over!\nScore: ${results.score}\nAccuracy: ${results.accuracy.toFixed(2)}%\nMax Combo: ${results.maxCombo}`);
      navigate('/home');
    } catch (error) {
      console.error('Failed to submit score', error);
    }
  };

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '100px' }}>Loading...</div>;
  }

  if (!beatmap) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: '100px' }}>Beatmap not found</div>;
  }

  return <GameCanvas beatmap={beatmap} onGameEnd={handleGameEnd} />;
};

export default GamePlay;
