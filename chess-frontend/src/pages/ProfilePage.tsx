import { useEffect, useState } from 'react';
import { userAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { Edit2, Save, X, Trophy, Target, TrendingUp } from 'lucide-react';

interface Stats {
  currentElo: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  peakElo: number;
  avgEloChange: number;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await userAPI.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await userAPI.updateProfile({ username: newUsername });
      updateUser({ username: res.data.username });
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const getEloTier = (elo: number) => {
    if (elo < 800) return { name: 'Novice', color: '#a0a0a0', icon: '🔰' };
    if (elo < 1000) return { name: 'Beginner', color: '#cd7f32', icon: '🥉' };
    if (elo < 1200) return { name: 'Casual', color: '#a0a0a0', icon: '♟' };
    if (elo < 1400) return { name: 'Club Player', color: '#c0c0c0', icon: '🥈' };
    if (elo < 1600) return { name: 'Advanced', color: '#ffd700', icon: '🥇' };
    if (elo < 1800) return { name: 'Expert', color: '#5b8af0', icon: '💎' };
    if (elo < 2000) return { name: 'Master', color: '#9c88ff', icon: '👑' };
    return { name: 'Grandmaster', color: '#ff6b6b', icon: '🏆' };
  };

  const tier = getEloTier(stats?.currentElo || user.eloRating);

  return (
    <div className="page">
      <div className="container profile-page">
        {/* Profile Header */}
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), #9c88ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: 'white', flexShrink: 0,
            boxShadow: 'var(--shadow-accent)',
          }}>
            {user.username.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            {editing ? (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  style={{ maxWidth: 200 }}
                />
                <button className="btn btn-success btn-sm" onClick={handleSave} disabled={saving}>
                  <Save size={14} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>{user.username}</h2>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(true)} title="Chỉnh sửa">
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.email}</span>
              <span style={{
                background: `${tier.color}22`, color: tier.color,
                border: `1px solid ${tier.color}44`,
                padding: '0.2rem 0.6rem', borderRadius: 100,
                fontSize: '0.8rem', fontWeight: 600,
              }}>
                {tier.icon} {tier.name}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
              {stats?.currentElo || user.eloRating}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ELO Rating
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
              {stats?.totalGames || 0}
            </div>
            <div className="stat-label">Tổng ván</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {stats?.wins || 0}
            </div>
            <div className="stat-label">Thắng</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              {stats?.losses || 0}
            </div>
            <div className="stat-label">Thua</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--draw)' }}>
              {stats?.draws || 0}
            </div>
            <div className="stat-label">Hòa</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
              {stats?.winRate?.toFixed(1) || 0}%
            </div>
            <div className="stat-label">Tỉ lệ thắng</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {stats?.peakElo || user.eloRating}
            </div>
            <div className="stat-label">ELO cao nhất</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📈 Phân tích chi tiết</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ELO Thay đổi Trung bình</div>
                <div style={{ fontWeight: 700, color: (stats?.avgEloChange || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(stats?.avgEloChange || 0) >= 0 ? '+' : ''}{stats?.avgEloChange?.toFixed(1) || '0.0'} / ván
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Trophy size={24} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ELO Cao nhất Đạt được</div>
                <div style={{ fontWeight: 700, color: 'var(--warning)' }}>{stats?.peakElo || user.eloRating}</div>
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Target size={24} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Hạng hiện tại</div>
                <div style={{ fontWeight: 700, color: tier.color }}>{tier.icon} {tier.name}</div>
              </div>
            </div>
          </div>

          {/* Win-Loss bar */}
          {(stats?.totalGames || 0) > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <span>🏆 {stats?.wins} thắng</span>
                <span>🤝 {stats?.draws} hòa</span>
                <span>💀 {stats?.losses} thua</span>
              </div>
              <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-tertiary)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${((stats?.wins || 0) / (stats?.totalGames || 1)) * 100}%`, background: 'var(--success)', transition: 'width 0.5s ease' }} />
                <div style={{ width: `${((stats?.draws || 0) / (stats?.totalGames || 1)) * 100}%`, background: 'var(--draw)', transition: 'width 0.5s ease' }} />
                <div style={{ width: `${((stats?.losses || 0) / (stats?.totalGames || 1)) * 100}%`, background: 'var(--danger)', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
