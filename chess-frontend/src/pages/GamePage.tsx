import { useState, useEffect, useRef, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuthStore } from '../store/authStore';
import { gameAPI } from '../api';
import { RotateCcw, Flag, Play } from 'lucide-react';

type GameResult = 'WIN' | 'LOSS' | 'DRAW' | null;
type PlayerColor = 'WHITE' | 'BLACK' | 'RANDOM';

const TIME_OPTIONS = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getAiLevelName(level: number): string {
  if (level <= 2) return 'Beginner';
  if (level <= 5) return 'Easy';
  if (level <= 9) return 'Casual';
  if (level <= 12) return 'Club';
  if (level <= 16) return 'Advanced';
  return 'Grandmaster';
}

export default function GamePage() {
  const { user, updateUser } = useAuthStore();

  // Game settings
  const [aiLevel, setAiLevel] = useState(5);
  const [colorChoice, setColorChoice] = useState<PlayerColor>('WHITE');
  const [timeChoice, setTimeChoice] = useState(300);
  const [gameStarted, setGameStarted] = useState(false);

  // Game state
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [fen, setFen] = useState(new Chess().fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Timer
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Stockfish
  const stockfishRef = useRef<Worker | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const moveListRef = useRef<HTMLDivElement>(null);

  // Init Stockfish worker
  useEffect(() => {
    try {
      const worker = new Worker('/stockfish/stockfish-lite.js');
      worker.postMessage('uci');
      worker.postMessage('isready');
      stockfishRef.current = worker;

      return () => worker.terminate();
    } catch (e) {
      console.error('Failed to load Stockfish worker', e);
    }
  }, []);


  // Scroll move list to bottom
  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Timer logic
  useEffect(() => {
    if (!gameStarted || gameResult) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTurn = gameRef.current.turn();
      if (currentTurn === 'w') {
        setWhiteTime(t => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            endGame(playerColor === 'white' ? 'LOSS' : 'WIN', 'timeout');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime(t => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            endGame(playerColor === 'black' ? 'LOSS' : 'WIN', 'timeout');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameStarted, gameResult, playerColor]);

  const getAiMove = useCallback((currentGame: Chess) => {
    if (!stockfishRef.current) return;
    setIsThinking(true);

    const worker = stockfishRef.current;
    const thinkTime = aiLevel <= 5 ? 300 : aiLevel <= 10 ? 800 : aiLevel <= 15 ? 1500 : 2500;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as string;
      if (msg.startsWith('bestmove')) {
        const parts = msg.split(' ');
        const move = parts[1];
        if (move && move !== '(none)') {
          const gameCopy = new Chess(gameRef.current.fen());
          try {
            gameCopy.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] || 'q' });
            setGame(gameCopy);
            setFen(gameCopy.fen());
            setMoveHistory(prev => [...prev, gameCopy.history().at(-1) || '']);
            checkGameEnd(gameCopy);
          } catch {}
        }
        setIsThinking(false);
      }
    };

    worker.postMessage(`setoption name Skill Level value ${Math.min(aiLevel, 20)}`);
    worker.postMessage(`position fen ${currentGame.fen()}`);
    worker.postMessage(`go movetime ${thinkTime}`);
  }, [aiLevel]);

  const checkGameEnd = useCallback((currentGame: Chess) => {
    if (currentGame.isCheckmate()) {
      const winner = currentGame.turn() === 'w' ? 'black' : 'white';
      const result: GameResult = winner === playerColor ? 'WIN' : 'LOSS';
      setStatusMsg(result === 'WIN' ? '🏆 Chiếu hết! Bạn thắng!' : '💀 Chiếu hết! Bạn thua!');
      endGame(result);
    } else if (currentGame.isStalemate()) {
      setStatusMsg('🤝 Hòa cờ - Thế cờ tắc!');
      endGame('DRAW');
    } else if (currentGame.isThreefoldRepetition()) {
      setStatusMsg('🤝 Hòa cờ - Lặp 3 lần!');
      endGame('DRAW');
    } else if (currentGame.isInsufficientMaterial()) {
      setStatusMsg('🤝 Hòa cờ - Thiếu quân!');
      endGame('DRAW');
    } else if (currentGame.isDraw()) {
      setStatusMsg('🤝 Hòa cờ - 50 nước!');
      endGame('DRAW');
    } else if (currentGame.inCheck()) {
      setStatusMsg('⚠️ Chiếu!');
    } else {
      setStatusMsg('');
    }
  }, [playerColor]);

  const endGame = useCallback(async (result: GameResult, _reason?: string) => {
    setGameResult(result);
    if (timerRef.current) clearInterval(timerRef.current);

    if (result && user) {
      try {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const res = await gameAPI.saveGame({
          playerColor,
          aiLevel,
          result,
          pgn: gameRef.current.pgn(),
          finalFen: gameRef.current.fen(),
          totalMoves: gameRef.current.history().length,
          durationSeconds: duration,
          timeControl: timeChoice,
        });
        const savedGame = res.data;
        if (savedGame?.eloAfter) {
          updateUser({ eloRating: savedGame.eloAfter });
        }
      } catch (err) {
        console.error('Failed to save game:', err);
      }
    }
  }, [user, playerColor, aiLevel, timeChoice, updateUser]);

  const startGame = () => {
    const newGame = new Chess();
    const color = colorChoice === 'RANDOM'
      ? (Math.random() > 0.5 ? 'white' : 'black')
      : colorChoice.toLowerCase() as 'white' | 'black';

    setGame(newGame);
    setFen(newGame.fen());
    setPlayerColor(color);
    setMoveHistory([]);
    setGameResult(null);
    setStatusMsg('');
    setWhiteTime(timeChoice);
    setBlackTime(timeChoice);
    setGameStarted(true);
    setIsThinking(false);
    startTimeRef.current = Date.now();

    // Set stockfish skill
    if (stockfishRef.current) {
      stockfishRef.current.postMessage(`setoption name Skill Level value ${aiLevel}`);
      stockfishRef.current.postMessage('ucinewgame');
    }

    // If player is Black, AI makes first move
    if (color === 'black') {
      setTimeout(() => getAiMove(newGame), 500);
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string, _piece?: string) => {
    if (!gameStarted || gameResult || isThinking) return false;
    if (game.turn() !== playerColor[0]) return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      setGame(gameCopy);
      setFen(gameCopy.fen());
      setMoveHistory(prev => [...prev, move.san]);

      const ended = checkGameEndImmediately(gameCopy);
      if (!ended) {
        setTimeout(() => getAiMove(gameCopy), 300);
      }
      return true;
    } catch {
      return false;
    }
  };

  const checkGameEndImmediately = (currentGame: Chess): boolean => {
    if (currentGame.isGameOver()) {
      checkGameEnd(currentGame);
      return true;
    }
    if (currentGame.inCheck()) setStatusMsg('⚠️ Chiếu!');
    else setStatusMsg('');
    return false;
  };

  const resign = () => {
    if (!gameStarted || gameResult) return;
    setStatusMsg('🏳️ Bạn đã xin thua!');
    endGame('LOSS');
  };

  const resetGame = () => {
    setGameStarted(false);
    setGame(new Chess());
    setFen(new Chess().fen());
    setMoveHistory([]);
    setGameResult(null);
    setStatusMsg('');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Format move list into pairs
  const movePairs: [string, string | undefined][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  const currentWhiteTime = whiteTime;
  const currentBlackTime = blackTime;
  const isWhiteActive = gameStarted && !gameResult && game.turn() === 'w';
  const isBlackActive = gameStarted && !gameResult && game.turn() === 'b';

  const handleUndo = () => {
    if (!gameStarted || gameResult || isThinking) return;
    
    if(moveHistory.length <2) return;
    const newHistory = moveHistory.slice(0, -2);
    const newGame = new Chess();
    newHistory.forEach(san => newGame.move(san));
    setGame(newGame);
    setFen(newGame.fen());
    setMoveHistory(newHistory);
  };
  return (
    <div className="game-page">
      <div className="game-layout">

        {/* LEFT SIDEBAR */}
        <aside className="game-sidebar animate-slide-left">
          {/* AI Settings */}
          <div className="glass-card game-panel">
            <div className="game-panel-title">⚙️ Cài đặt AI</div>
            <div style={{ marginBottom: '1rem' }}>
              <div className="form-label" style={{ marginBottom: '0.5rem' }}>
                Cấp độ: {aiLevel} - {getAiLevelName(aiLevel)}
              </div>
              <div className="ai-level-grid">
                {Array.from({ length: 20 }, (_, i) => i + 1).map(level => (
                  <button
                    key={level}
                    className={`ai-level-btn ${aiLevel === level ? 'selected' : ''}`}
                    onClick={() => !gameStarted && setAiLevel(level)}
                    disabled={gameStarted}
                    title={`Level ${level}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color & Time */}
          {!gameStarted && (
            <div className="glass-card game-panel">
              <div className="game-panel-title">🎨 Màu quân</div>
              <div className="color-picker" style={{ marginBottom: '1.25rem' }}>
                {(['WHITE', 'BLACK', 'RANDOM'] as PlayerColor[]).map(c => (
                  <div
                    key={c}
                    className={`color-option ${colorChoice === c ? 'selected' : ''}`}
                    onClick={() => setColorChoice(c)}
                  >
                    {c === 'WHITE' ? '⬜ Trắng' : c === 'BLACK' ? '⬛ Đen' : '🎲 Random'}
                  </div>
                ))}
              </div>

              <div className="game-panel-title">⏱️ Thời gian</div>
              <div className="time-controls">
                {TIME_OPTIONS.map(t => (
                  <button
                    key={t.seconds}
                    className={`time-btn ${timeChoice === t.seconds ? 'selected' : ''}`}
                    onClick={() => setTimeChoice(t.seconds)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start/Control Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!gameStarted ? (
              <button id="btn-start-game" className="btn btn-primary" onClick={startGame}>
                <Play size={16} /> Bắt đầu ván cờ
              </button>
            ) : (
              <>
                <button className="btn btn-danger btn-sm" onClick={resign} disabled={!!gameResult}>
                  <Flag size={14} /> Xin thua
                </button>
                <button className="btn btn-ghost btn-sm" onClick={resetGame}>
                  <RotateCcw size={14} /> Ván mới
                </button>
              </>
            )}
          </div>
        </aside>

        {/* BOARD CENTER */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status */}
          {statusMsg && (
            <div className={`game-status ${
              statusMsg.includes('Chiếu hết') ? 'checkmate' :
              statusMsg.includes('Hòa') ? 'draw' :
              statusMsg.includes('Chiếu!') ? 'check' : 'thinking'
            }`} style={{ width: '100%', maxWidth: 560 }}>
              {statusMsg}
            </div>
          )}

          {isThinking && (
            <div className="game-status thinking" style={{ width: '100%', maxWidth: 560 }}>
              🤖 AI đang suy nghĩ
              <span className="thinking-dots" style={{ marginLeft: 4 }}>
                <span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          )}

          {/* Top Player (Opponent) */}
          <div className="player-info" style={{ maxWidth: 560, width: '100%' }}>
            <div className={`player-avatar ${playerColor === 'white' ? 'player-piece-black' : 'player-piece-white'}`}>
              🤖
            </div>
            <div>
              <div className="player-name">Stockfish AI</div>
              <div className="player-elo">Level {aiLevel} · ~{600 + (aiLevel - 1) * 150} ELO</div>
            </div>
            <div className={`player-timer ${
              (playerColor === 'white' ? isBlackActive : isWhiteActive) ? 'active' : ''
            } ${
              (playerColor === 'white' ? currentBlackTime : currentWhiteTime) < 30 ? 'low' : ''
            }`}>
              {formatTime(playerColor === 'white' ? currentBlackTime : currentWhiteTime)}
            </div>
          </div>

          {/* Chess Board */}
          <div className="board-container" style={{ touchAction: 'none', userSelect: 'none', width: '100%', maxWidth: 560, margin: '0 auto' }}>
            <Chessboard
              options={{
                position: fen,
                onPieceDrop: ({ sourceSquare, targetSquare, piece }) => {
                  if (!targetSquare) return false;
                  return onDrop(sourceSquare, targetSquare, piece.pieceType);
                },
                boardOrientation: playerColor === 'white' ? 'white' : 'black',
                boardStyle: {
                  borderRadius: '8px',
                  touchAction: 'none', // Chặn trình duyệt can thiệp cuộn trang
                },
                darkSquareStyle: { backgroundColor: '#4a7c59' },
                lightSquareStyle: { backgroundColor: '#f0d9b5' },
                animationDurationInMs: 180,
                allowDragging: gameStarted && !gameResult && !isThinking,
                canDragPiece: ({ piece }) => {
                  if (!gameStarted || gameResult || isThinking) return false;
                  return piece?.pieceType ? piece.pieceType.startsWith(playerColor === 'white' ? 'w' : 'b') : false;
                }
              }}
            />
          </div>

          {/* Bottom Player (User) */}
          <div className="player-info" style={{ maxWidth: 560, width: '100%' }}>
            <div className={`player-avatar ${playerColor === 'white' ? 'player-piece-white' : 'player-piece-black'}`}>
              {user ? user.username.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <div className="player-name">{user?.username || 'Bạn'}</div>
              <div className="player-elo">{user?.eloRating} ELO · Quân {playerColor === 'white' ? 'Trắng ⬜' : 'Đen ⬛'}</div>
            </div>
            <div className={`player-timer ${
              (playerColor === 'white' ? isWhiteActive : isBlackActive) ? 'active' : ''
            } ${
              (playerColor === 'white' ? currentWhiteTime : currentBlackTime) < 30 ? 'low' : ''
            }`}>
              {formatTime(playerColor === 'white' ? currentWhiteTime : currentBlackTime)}
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR - Move History */}
        <aside className="game-sidebar animate-slide-right">
          <div className="glass-card game-panel" style={{ flex: 1 }}>
            <div className="game-panel-title">📜 Lịch sử nước đi</div>
            <div className="move-list" ref={moveListRef}>
              {movePairs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  Chưa có nước đi nào
                </p>
              ) : (
                movePairs.map(([white, black], i) => (
                  <div key={i} className="move-row">
                    <span className="move-num">{i + 1}.</span>
                    <span className={`move-san ${moveHistory.length === i * 2 + 1 && !black ? 'current' : ''}`}>
                      {white}
                    </span>
                    <span className={`move-san ${black && moveHistory.length === i * 2 + 2 ? 'current' : ''}`}>
                      {black || ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Game Info */}
          {gameStarted && (
            <div className="glass-card game-panel">
              <div className="game-panel-title">📊 Thông tin ván</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tổng nước đi:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{moveHistory.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cấp độ AI:</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{aiLevel} - {getAiLevelName(aiLevel)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lượt đi:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {game.turn() === 'w' ? '⬜ Trắng' : '⬛ Đen'}
                  </span>
                </div>
              </div>
            </div>
          )}
          {gameStarted && (
            <button className="btn btn-ghost" onClick={handleUndo} disabled={moveHistory.length < 2 || isThinking || !!gameResult}>
              🔄 Hoàn tác
            </button>
          )}
        </aside>
      </div>

      {/* RESULT MODAL */}
      {gameResult && (
        <div className="modal-overlay" onClick={resetGame}>
          <div className="glass-card modal" onClick={e => e.stopPropagation()}>
            <span className="modal-icon">
              {gameResult === 'WIN' ? '🏆' : gameResult === 'LOSS' ? '💀' : '🤝'}
            </span>
            <h2 className="modal-title" style={{
              color: gameResult === 'WIN' ? 'var(--success)' :
                     gameResult === 'LOSS' ? 'var(--danger)' : 'var(--draw)'
            }}>
              {gameResult === 'WIN' ? 'Bạn Thắng!' :
               gameResult === 'LOSS' ? 'Bạn Thua!' : 'Hòa cờ!'}
            </h2>
            <p className="modal-subtitle">{statusMsg}</p>
            <p className="modal-subtitle" style={{ marginBottom: '1rem' }}>
              vs AI Level {aiLevel} ({getAiLevelName(aiLevel)}) · {moveHistory.length} nước đi
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={startGame}>
                🔄 Chơi lại
              </button>
              <button className="btn btn-ghost" onClick={resetGame}>
                ⚙️ Đổi cài đặt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
