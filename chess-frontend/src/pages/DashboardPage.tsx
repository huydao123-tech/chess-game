import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { dashboardAPI } from '../api';
import type { DashboardSummaryDTO } from '../api';
import { Swords, Trophy, Activity, Flame, Medal, Clock, ArrowRight } from 'lucide-react';
import '../styles/global.css';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboard(user.id);
    }
  }, [user]);

  const loadDashboard = async (userId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardAPI.getSummary(userId);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ padding: '4rem', textAlign: 'center', color: '#ff6b6b' }}>
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <pre style={{ textAlign: 'left', background: '#111', padding: '1rem', marginTop: '1rem' }}>
          Please check the backend logs or console.
        </pre>
      </div>
    );
  }

  if (!data) return (
    <div className="page" style={{ padding: '4rem', textAlign: 'center' }}>
      <h2>No Data Available</h2>
    </div>
  );

  // Add optional chaining to prevent crashes if structure differs
  const userRankInfo = data.userRankInfo || {};
  const overallStats = data.overallStats || { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0, winStreak: 0 };
  const recentGames = data.recentGameDTO?.last5Games || (data as any).RecentGameDTO?.last5Games || [];
  const topPlayers = data.topPlayerDTO?.top5EloRatingPlayer || (data as any).TopPlayerDTO?.top5EloRatingPlayer || [];

  return (
    <div className="page" style={{ padding: '2rem 0' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* 1. HEADER HERO CARD */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-5%', top: '-20%', opacity: 0.05, fontSize: '15rem', pointerEvents: 'none' }}>
            ♚
          </div>
          
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), #9c88ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '3rem', fontWeight: 800, color: 'white', flexShrink: 0,
            boxShadow: 'var(--shadow-accent)',
          }}>
            {(userRankInfo.userName || userRankInfo.username || '?').charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, zIndex: 1 }}>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>Welcome back, {userRankInfo.userName || userRankInfo.username || 'Player'}!</h1>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={20} color="var(--accent-primary)" />
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userRankInfo.eloRating} ELO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Medal size={20} color="#ffd700" />
                <span style={{ fontSize: '1.2rem' }}>Rank #{userRankInfo.rankPosition}</span>
              </div>
              {overallStats.winStreak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff6b6b' }}>
                  <Flame size={20} />
                  <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{overallStats.winStreak} Win Streak</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. QUICK PLAY & STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Quick Play Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Swords size={24} color="var(--accent-primary)" />
              Quick Actions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/play')}>
                ♟️ Play vs Stockfish AI
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/online')}>
                ⚔️ Play Online (PvP)
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-color)' }} onClick={() => navigate('/tournaments')}>
                🏆 Join Tournaments
              </button>
            </div>
          </div>

          {/* Overall Stats Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} color="#9c88ff" />
              Performance Stats
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-card-hover)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total Games</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{overallStats.totalGames}</div>
              </div>
              <div style={{ background: 'var(--bg-card-hover)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Win Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: overallStats.winRate >= 50 ? 'var(--success-color, #4cd137)' : 'inherit' }}>
                  {overallStats.winRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: '#4cd137' }}>{overallStats.wins} Wins</span>
              <span style={{ color: '#fbc531' }}>{overallStats.draws} Draws</span>
              <span style={{ color: '#e84118' }}>{overallStats.losses} Losses</span>
            </div>
            {/* Win/Loss Bar */}
            <div style={{ width: '100%', height: '8px', borderRadius: '4px', display: 'flex', overflow: 'hidden', background: '#e84118' }}>
              <div style={{ width: `${(overallStats.wins / (overallStats.totalGames || 1)) * 100}%`, background: '#4cd137', height: '100%' }}></div>
              <div style={{ width: `${(overallStats.draws / (overallStats.totalGames || 1)) * 100}%`, background: '#fbc531', height: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* 3. LISTS ROW (Recent Games & Leaderboard) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Recent Games */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={24} color="#00a8ff" />
                Recent Matches
              </h2>
              <Link to="/history" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                View All <ArrowRight size={14} />
              </Link>
            </div>
            
            {recentGames.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No games played yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentGames.map((game: any) => {
                  const isWhite = game.whitePlayer?.id === user?.id;
                  const resultColor = game.result === 'WIN' ? '#4cd137' : game.result === 'LOSS' ? '#e84118' : '#fbc531';
                  return (
                    <div key={game.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: isWhite ? '#fff' : '#000', border: '1px solid #999' }} title={isWhite ? 'White' : 'Black'}></div>
                        <div>
                          <div style={{ fontWeight: 600 }}>vs {game.aiLevel > 0 ? `Stockfish Lvl ${game.aiLevel}` : (isWhite ? game.blackPlayer?.username : game.whitePlayer?.username) || 'Unknown'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(game.playedAt).toLocaleDateString()} • {game.gameType}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: resultColor }}>{game.result}</div>
                        {game.eloChange !== null && game.eloChange !== undefined && (
                          <div style={{ fontSize: '0.85rem', color: game.eloChange >= 0 ? '#4cd137' : '#e84118' }}>
                            {game.eloChange > 0 ? '+' : ''}{game.eloChange} ELO
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Players */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Medal size={24} color="#ffd700" />
              Global Top 5
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topPlayers.map((p: any, index: number) => (
                <div key={p.id || index} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px',
                  border: p.id === user?.id ? '1px solid var(--accent-primary)' : '1px solid transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: 30, height: 30, borderRadius: '50%', 
                      background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--bg-primary)',
                      color: index < 3 ? '#000' : 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ fontWeight: 600 }}>{p.username} {p.id === user?.id && '(You)'}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {p.eloRating} ELO
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
