import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameAPI } from '../api';
import { Trophy, Sword, Minus, ChevronRight, ChevronLeft, Filter } from 'lucide-react';

interface Game {
  id: number;
  playerColor: string;
  aiLevel: number;
  result: string;
  totalMoves: number;
  durationSeconds: number;
  timeControl: number;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  playedAt: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadGames();
  }, [page]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const res = await gameAPI.getGames(page, 15);
      setGames(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = filter === 'ALL' ? games : games.filter(g => g.result === filter);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>📜 Lịch sử Ván đấu</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Xem lại tất cả ván cờ bạn đã chơi</p>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            {['ALL', 'WIN', 'LOSS', 'DRAW'].map(f => (
              <button
                key={f}
                className={`time-btn ${filter === f ? 'selected' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'ALL' ? 'Tất cả' : f === 'WIN' ? '🏆 Thắng' : f === 'LOSS' ? '💀 Thua' : '🤝 Hòa'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎯</div>
            <h3 style={{ marginBottom: '0.5rem' }}>Chưa có ván cờ nào</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Hãy chơi ván đầu tiên với AI!
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/play')}>
              ♟ Chơi ngay
            </button>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kết quả</th>
                  <th>Quân</th>
                  <th>AI Level</th>
                  <th>Nước đi</th>
                  <th>Thời gian</th>
                  <th>ELO</th>
                  <th>Ngày chơi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game, idx) => (
                  <tr key={game.id} onClick={() => navigate(`/replay/${game.id}`)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {page * 15 + idx + 1}
                    </td>
                    <td>
                      <span className={`badge badge-${game.result.toLowerCase()}`}>
                        {game.result === 'WIN' ? <><Trophy size={12} /> Thắng</> :
                         game.result === 'LOSS' ? <><Sword size={12} /> Thua</> :
                         <><Minus size={12} /> Hòa</>}
                      </span>
                    </td>
                    <td>
                      {game.playerColor === 'WHITE' ? '⬜ Trắng' : '⬛ Đen'}
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        Lv.{game.aiLevel}
                      </span>
                    </td>
                    <td>{game.totalMoves}</td>
                    <td>{formatDuration(game.durationSeconds)}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {game.eloAfter}
                      </span>
                      {game.eloChange !== 0 && (
                        <span style={{
                          marginLeft: '0.4rem', fontSize: '0.75rem',
                          color: game.eloChange > 0 ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {game.eloChange > 0 ? '+' : ''}{game.eloChange}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(game.playedAt)}</td>
                    <td>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={16} /> Trước
            </button>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '0 1rem' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              Sau <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
