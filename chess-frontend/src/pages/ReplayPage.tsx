import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { gameAPI } from '../api';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause } from 'lucide-react';

interface GameDetail {
  id: number;
  playerColor: string;
  aiLevel: number;
  result: string;
  pgn: string;
  totalMoves: number;
  durationSeconds: number;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  playedAt: string;
}

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [currentFen, setCurrentFen] = useState(new Chess().fen());
  const [fens, setFens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadGame();
  }, [id]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentIdx(prev => {
          if (prev >= fens.length - 2) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isPlaying, fens.length]);

  useEffect(() => {
    if (currentIdx >= 0 && currentIdx < fens.length - 1) {
      setCurrentFen(fens[currentIdx + 1]);
    } else if (currentIdx === -1) {
      setCurrentFen(fens[0] || new Chess().fen());
    }
  }, [currentIdx, fens]);

  const loadGame = async () => {
    try {
      const res = await gameAPI.getGame(Number(id));
      const detail = res.data;
      setGameDetail(detail);

      if (detail.pgn) {
        const chess = new Chess();
        chess.loadPgn(detail.pgn);
        const history = chess.history({ verbose: true });
        setMoves(chess.history());

        // Pre-compute all FENs
        const allFens = [new Chess().fen()];
        const replayChess = new Chess();
        for (const move of history) {
          replayChess.move(move);
          allFens.push(replayChess.fen());
        }
        setFens(allFens);
        setCurrentFen(allFens[0]);
      }
    } catch {
      navigate('/history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!gameDetail) return null;

  const playerColor = gameDetail.playerColor.toLowerCase() as 'white' | 'black';

  const movesList: [string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movesList.push([moves[i], moves[i + 1]]);
  }

  return (
    <div className="game-page">
      <div className="game-layout">
        {/* LEFT: Game Info */}
        <aside className="game-sidebar animate-slide-left">
          <div className="glass-card game-panel">
            <div className="game-panel-title">📋 Thông tin ván đấu</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Kết quả:</span>
                <span className={`badge badge-${gameDetail.result.toLowerCase()}`}>
                  {gameDetail.result === 'WIN' ? '🏆 Thắng' : gameDetail.result === 'LOSS' ? '💀 Thua' : '🤝 Hòa'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>AI Level:</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{gameDetail.aiLevel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quân:</span>
                <span>{gameDetail.playerColor === 'WHITE' ? '⬜ Trắng' : '⬛ Đen'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng nước:</span>
                <span style={{ fontWeight: 600 }}>{gameDetail.totalMoves}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ELO:</span>
                <span>
                  {gameDetail.eloBefore} →{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{gameDetail.eloAfter}</strong>
                  {' '}
                  <span style={{ color: gameDetail.eloChange >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.8rem' }}>
                    ({gameDetail.eloChange >= 0 ? '+' : ''}{gameDetail.eloChange})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
            <ChevronLeft size={14} /> Quay lại lịch sử
          </button>
        </aside>

        {/* CENTER: Board */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {/* Move indicator */}
          <div style={{
            padding: '0.5rem 1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-secondary)',
          }}>
            {currentIdx === -1 ? 'Vị trí ban đầu' : `Nước ${currentIdx + 1} / ${moves.length}`}
            {currentIdx >= 0 && moves[currentIdx] && (
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
                · {moves[currentIdx]}
              </span>
            )}
          </div>

          <div className="board-container">
            <Chessboard
              options={{
                position: currentFen,
                boardOrientation: playerColor,
                darkSquareStyle: { backgroundColor: '#4a7c59' },
                lightSquareStyle: { backgroundColor: '#f0d9b5' },
                animationDurationInMs: 300,
                allowDragging: false,
              }}
            />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => { setIsPlaying(false); setCurrentIdx(-1); }} title="Đầu">
              <SkipBack size={18} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => { setIsPlaying(false); setCurrentIdx(i => Math.max(-1, i - 1)); }} title="Trước">
              <ChevronLeft size={18} />
            </button>
            <button className="btn btn-primary btn-icon" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? 'Dừng' : 'Tự động'}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => { setIsPlaying(false); setCurrentIdx(i => Math.min(fens.length - 2, i + 1)); }} title="Sau">
              <ChevronRight size={18} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => { setIsPlaying(false); setCurrentIdx(fens.length - 2); }} title="Cuối">
              <SkipForward size={18} />
            </button>
          </div>
        </main>

        {/* RIGHT: Move List */}
        <aside className="game-sidebar animate-slide-right">
          <div className="glass-card game-panel" style={{ flex: 1 }}>
            <div className="game-panel-title">📜 Nước đi</div>
            <div className="move-list">
              {movesList.map(([white, black], i) => (
                <div key={i} className="move-row">
                  <span className="move-num">{i + 1}.</span>
                  <span
                    className={`move-san ${currentIdx === i * 2 ? 'current' : ''}`}
                    onClick={() => setCurrentIdx(i * 2)}
                  >
                    {white}
                  </span>
                  <span
                    className={`move-san ${black && currentIdx === i * 2 + 1 ? 'current' : ''}`}
                    onClick={() => black && setCurrentIdx(i * 2 + 1)}
                  >
                    {black || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
