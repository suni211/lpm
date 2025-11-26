import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './SoloRank.css';

// Interfaces
interface PlayerRankInfo {
    player_card_id: number;
    player_name: string;
    position: string;
    team_name: string;
    ovr: number;
    solo_rating: number;
    wins: number;
    losses: number;
    rank: number;
}

interface MatchResult {
    winnerId: number;
    loserId: number;
    player1RatingChange: number;
    player2RatingChange: number;
    player1ExpGained: number;
    player2ExpGained: number;
}

const SoloRank: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [myTopPlayer, setMyTopPlayer] = useState<PlayerRankInfo | null>(null);
    const [leaderboard, setLeaderboard] = useState<PlayerRankInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [queueStatus, setQueueStatus] = useState('IDLE');
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

    const pollingInterval = 3000; // 3 seconds
    let intervalId: NodeJS.Timeout | null = null;

    const fetchMyTopPlayer = useCallback(async () => {
        try {
            const { data } = await api.get('/solo-rank/my-top-player');
            setMyTopPlayer(data.player);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const { data } = await api.get('/solo-rank/leaderboard');
            setLeaderboard(data.leaderboard);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const checkQueueStatus = useCallback(async (playerCardId: number) => {
        try {
            const { data } = await api.get(`/solo-rank/queue/status/${playerCardId}`);
            setQueueStatus(data.status);
            if (data.status === 'MATCHED') {
                setIsSearching(false);
                // In a real scenario, you'd fetch match details with the data.match_id
                // For now, we'll just show a success message
                showToast('상대를 찾았습니다! 경기 결과가 곧 표시됩니다.', 'success');
                // The join-queue endpoint already returns the result, so we just wait
            }
        } catch (error) {
            console.error('큐 상태 확인 오류:', error);
            setIsSearching(false); // Stop searching on error
        }
    }, [showToast]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await Promise.all([fetchMyTopPlayer(), fetchLeaderboard()]);
            setLoading(false);
        };
        fetchData();
    }, [fetchMyTopPlayer, fetchLeaderboard]);

    useEffect(() => {
        if (isSearching && myTopPlayer) {
            intervalId = setInterval(() => {
                checkQueueStatus(myTopPlayer.player_card_id);
            }, pollingInterval);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isSearching, myTopPlayer, checkQueueStatus]);


    const handleJoinQueue = async () => {
        if (!myTopPlayer) {
            showToast('솔로 랭크에 참여할 선수가 없습니다.', 'error');
            return;
        }
        setIsSearching(true);
        setQueueStatus('SEARCHING');
        try {
            const { data } = await api.post('/solo-rank/queue/join', { playerCardId: myTopPlayer.player_card_id });
            if (data.matched) {
                setIsSearching(false);
                setMatchResult(data.matchResult);
                showToast('매치 성사! 경기 결과를 확인하세요.', 'success');
                fetchMyTopPlayer(); // Refresh player stats
                fetchLeaderboard();
            }
        } catch (error: any) {
            showToast(error.response?.data?.error || '큐 참가에 실패했습니다.', 'error');
            setIsSearching(false);
        }
    };

    const handleCancelQueue = async () => {
        if (!myTopPlayer) return;
        setIsSearching(false);
        try {
            await api.post('/solo-rank/queue/cancel', { playerCardId: myTopPlayer.player_card_id });
            showToast('큐 참가를 취소했습니다.', 'info');
        } catch (error) {
            showToast('큐 취소에 실패했습니다.', 'error');
        }
    };
    
    if (loading) return <div className="solorank-loading">Loading...</div>;

    return (
        <div className="solorank">
            <div className="solorank-container">
                <div className="solorank-header"><h1>솔로 랭크</h1></div>

                {myTopPlayer && (
                    <div className="my-player-card">
                        <h2>내 대표 선수</h2>
                        <div className="player-info">
                            <h3>{myTopPlayer.player_name}</h3>
                            <span>{myTopPlayer.position} / OVR {myTopPlayer.ovr}</span>
                        </div>
                        <div className="player-rank">
                            <div className="rating">Rating: <strong>{myTopPlayer.solo_rating}</strong></div>
                            <div className="record">{myTopPlayer.wins}승 {myTopPlayer.losses}패</div>
                        </div>
                        <div className="queue-controls">
                            {!isSearching ? (
                                <button onClick={handleJoinQueue} className="btn-join">큐 시작</button>
                            ) : (
                                <div className="searching-indicator">
                                    <span>상대 검색 중...</span>
                                    <div className="mini-spinner"></div>
                                    <button onClick={handleCancelQueue} className="btn-cancel">취소</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="leaderboard">
                    <h2>리더보드</h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>선수</th>
                                    <th>팀</th>
                                    <th>포지션</th>
                                    <th>레이팅</th>
                                    <th>전적</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map(p => (
                                    <tr key={p.player_card_id} className={p.player_card_id === myTopPlayer?.player_card_id ? 'my-player-row' : ''}>
                                        <td>{p.rank}</td>
                                        <td>{p.player_name}</td>
                                        <td>{p.team_name}</td>
                                        <td>{p.position}</td>
                                        <td>{p.solo_rating}</td>
                                        <td>{p.wins}승 {p.losses}패</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {matchResult && (
                    <div className="modal-overlay" onClick={() => setMatchResult(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h2>매치 결과</h2>
                            <p>
                                {matchResult.winnerId === myTopPlayer?.player_card_id ? '승리!' : '패배...'}
                            </p>
                            <p>
                                레이팅 변동: {matchResult.winnerId === myTopPlayer?.player_card_id ? `+${matchResult.player1RatingChange}` : matchResult.player1RatingChange}
                            </p>
                            <button onClick={() => setMatchResult(null)}>닫기</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoloRank;
