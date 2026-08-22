import { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';
import { 
  Swords, Copy, Check, Flag, 
  Send, MessageSquare, ScrollText, LogOut, Radio, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

type GameResult = 'WIN' | 'LOSS' | 'DRAW' | null;

const TIME_OPTIONS = [
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PvpMatch() {
  const { user } = useAuthStore();

  // === LOBBY STATE ===
  const [roomIdInput, setRoomIdInput] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [timeChoice, setTimeChoice] = useState(300);

  // === MATCH STATE ===
  const [gameStarted, setGameStarted] = useState(false);
  const [myColor, setMyColor] = useState<'white' | 'black'>('white');
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [statusMsg, setStatusMsg] = useState('');

  // === CHESS STATE ===
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(new Chess().fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const gameRef = useRef(game);
  const navigate = useNavigate();
  gameRef.current = game;

  // === TIMERS ===
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // === CHAT & TABS ===
  const [activeTab, setActiveTab] = useState<'moves' | 'chat'>('moves');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // === REFS ===
  const stompClientRef = useRef<Client | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const moveScrollRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn danh sách tin nhắn & nước đi
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (moveScrollRef.current) {
      moveScrollRef.current.scrollTop = moveScrollRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Bộ đếm giờ
  useEffect(() => {
    if (!gameStarted || gameResult) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const turn = gameRef.current.turn();
      if (turn === 'w') {
        setWhiteTime((t) => {
          if (t <= 1) {
            handleTimeOut('white');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime((t) => {
          if (t <= 1) {
            handleTimeOut('black');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameResult, myColor]);

  const handleTimeOut = (lostColor: 'white' | 'black') => {
    if (timerRef.current) clearInterval(timerRef.current);
    const result: GameResult = myColor === lostColor ? 'LOSS' : 'WIN';
    setGameResult(result);
    setStatusMsg(result === 'WIN' ? '🏆 Đối thủ hết giờ! Bạn thắng!' : '💀 Hết giờ! Bạn đã thua!');
  };
  const handleReview = () => {
    navigate('/review', { 
    state: { moves: moveHistory } // 'movesHistory' là mảng lưu các nước đi ván vừa rồi của bạn
  });
  }
  // === WEBSOCKET CONNECTION & MESSAGE HANDLER ===
  const connectToRoom = (roomId: string, isHost: boolean) => {
    if (!roomId.trim()) return;

    // Gán ngay màu quân: Chủ phòng là Trắng, Khách là Đen
    const assignedColor = isHost ? 'white' : 'black';
    setMyColor(assignedColor);

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      debug: (str: string) => console.log('[STOMP]', str),
      onConnect: () => {
        setCurrentRoomId(roomId);

        // 1. Subscribe kênh nhận tin nhắn của phòng
        client.subscribe(`/topic/game/${roomId}`, (message: IMessage) => {
          const payload = JSON.parse(message.body);
          onMessageReceived(payload, isHost, client, roomId);
        });

        // 2. Bắn tin nhắn báo danh vào phòng
        client.publish({
          destination: `/app/game/${roomId}/join`,
          body: JSON.stringify({
            type: 'JOIN',
            roomId: roomId,
            sender: user?.username || 'Player',
            playerColor: isHost ? 'WHITE' : 'BLACK',
            timeControl: timeChoice,
          }),
        });
      },
    });

    client.activate();
    stompClientRef.current = client;
  };

  // Xử lý gói tin WebSocket nhận về từ Server
  const onMessageReceived = (msg: any, isHost: boolean, client: Client, roomId: string) => {
    const isMe = msg.sender === user?.username;

    switch (msg.type) {
      // 1. Khách vừa vào phòng -> Chủ phòng nhận được tin này
      case 'JOIN':
        if (!isMe) {
          setOpponentName(msg.sender);
          setGameStarted(true);
          setStatusMsg('⚔️ Trận đấu đã bắt đầu! Lượt của bên Trắng (Host).');

          // Nếu mình là Chủ phòng -> Phản hồi lại (ACK) để Khách biết tên Chủ phòng
          if (isHost) {
            client.publish({
              destination: `/app/game/${roomId}/join`,
              body: JSON.stringify({
                type: 'JOIN_ACK',
                roomId: roomId,
                sender: user?.username,
                playerColor: 'WHITE',
                timeControl: timeChoice,
              }),
            });
          }
        }
        break;

      // 2. Khách nhận được phản hồi từ Chủ phòng
      case 'JOIN_ACK':
        if (!isMe) {
          setOpponentName(msg.sender);
          setGameStarted(true);
          setMyColor('black'); // Khách chắc chắn là Đen
          if (msg.timeControl) {
            setWhiteTime(msg.timeControl);
            setBlackTime(msg.timeControl);
          }
          setStatusMsg('⚔️ Đã kết nối với Chủ phòng! Lượt của bên Trắng.');
        }
        break;

      case 'MOVE':
        if (!isMe) {
          // Đối thủ đi cờ -> Cập nhật lên bàn cờ của mình
          setGame((prevGame) => {
            const gameCopy = new Chess(prevGame.fen());
            try {
              const move = gameCopy.move({
                from: msg.from,
                to: msg.to,
                promotion: msg.promotion || 'q',
              });
              if (move) {
                setFen(gameCopy.fen());
                setMoveHistory((prev) => [...prev, move.san]);
                checkGameEnd(gameCopy);
              }
            } catch (e) {
              console.error('Lỗi sync nước đi', e);
            }
            return gameCopy;
          });
        }
        break;

      case 'RESIGN':
        if (!isMe) {
          setGameResult('WIN');
          setStatusMsg('🏆 Đối thủ đã xin thua! Bạn thắng!');
        }
        break;

      case 'CHAT':
        setChatMessages((prev) => [
          ...prev,
          {
            sender: msg.sender,
            text: msg.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;
    }
  };

  // Kiểm tra cờ hết trận
  const checkGameEnd = (currentGame: Chess) => {
    if (currentGame.isCheckmate()) {
      const winner = currentGame.turn() === 'w' ? 'black' : 'white';
      const result: GameResult = winner === myColor ? 'WIN' : 'LOSS';
      setGameResult(result);
      setStatusMsg(result === 'WIN' ? '🏆 Chiếu hết! Bạn thắng!' : '💀 Chiếu hết! Bạn thua!');
    } else if (currentGame.isDraw()) {
      setGameResult('DRAW');
      setStatusMsg('🤝 Hòa cờ!');
    } else if (currentGame.inCheck()) {
      setStatusMsg('⚠️ Đang bị Chiếu!');
    } else {
      setStatusMsg(currentGame.turn() === myColor[0] ? '👉 Lượt của bạn!' : '⏳ Đối thủ đang đi...');
    }
  };

  // Người chơi kéo thả quân cờ
  const onDrop = (sourceSquare: string, targetSquare: string, _piece?: string) => {
    if (!gameStarted || gameResult) return false;
    // Khóa nước nếu chưa đến lượt của mình
    if (game.turn() !== myColor[0]) return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      // Cập nhật máy mình
      setGame(gameCopy);
      setFen(gameCopy.fen());
      setMoveHistory((prev) => [...prev, move.san]);
      checkGameEnd(gameCopy);

      // Bắn nước đi lên Socket Server
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: `/app/game/${currentRoomId}/move`,
          body: JSON.stringify({
            type: 'MOVE',
            roomId: currentRoomId,
            sender: user?.username,
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',
            san: move.san,
          }),
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  // Tạo phòng mới
  const handleCreateRoom = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setWhiteTime(timeChoice);
    setBlackTime(timeChoice);
    connectToRoom(randomCode, true);
  };

  // Vào phòng có sẵn
  const handleJoinRoom = () => {
    if (!roomIdInput.trim()) return;
    connectToRoom(roomIdInput.trim().toUpperCase(), false);
  };

  // Gửi tin nhắn Chat
  const sendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !stompClientRef.current?.connected) return;

    stompClientRef.current.publish({
      destination: `/app/game/${currentRoomId}/chat`,
      body: JSON.stringify({
        type: 'CHAT',
        roomId: currentRoomId,
        sender: user?.username || 'Bạn',
        text: chatInput.trim(),
      }),
    });
    setChatInput('');
  };

  // Xin thua
  const handleResign = () => {
    if (!gameStarted || gameResult) return;
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/game/${currentRoomId}/action`,
        body: JSON.stringify({
          type: 'RESIGN',
          roomId: currentRoomId,
          sender: user?.username,
        }),
      });
    }
    setGameResult('LOSS');
    setStatusMsg('🏳️ Bạn đã đầu hàng!');
  };

  // Rời phòng / Ngắt kết nối
  const handleLeaveRoom = () => {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
    }
    setCurrentRoomId(null);
    setGameStarted(false);
    setOpponentName(null);
    setGame(new Chess());
    setFen(new Chess().fen());
    setMoveHistory([]);
    setChatMessages([]);
    setGameResult(null);
  };

  const copyRoomCode = () => {
    if (currentRoomId) {
      navigator.clipboard.writeText(currentRoomId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Cặp nước đi
  const movePairs: [string, string | undefined][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push([moveHistory[i], moveHistory[i + 1]]);
  }

  // ==========================================
  // RENDER 1: LOBBY TẠO / VÀO PHÒNG
  // ==========================================
  if (!currentRoomId) {
    return (
      <div className="game-page" style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem' }}>
        <div className="glass-card animate-scale-up" style={{ maxWidth: 520, width: '100%', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚔️</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Đấu Trường Cờ Online</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Thách đấu bạn bè theo thời gian thực (PvP Realtime)
            </p>
          </div>

          {/* Cài đặt thời gian */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Clock size={15} color="var(--accent-primary)" /> Thời gian mỗi bên
            </label>
            <div className="time-controls" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {TIME_OPTIONS.map((t) => (
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

          {/* Nút Tạo phòng */}
          <button className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', marginBottom: '1.5rem' }} onClick={handleCreateRoom}>
            <Swords size={18} /> Tạo phòng thi đấu mới
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>HOẶC</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Ô Nhập mã vào phòng */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Nhập mã phòng bạn bè gửi</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="VD: A8F9X2"
                maxLength={6}
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, textAlign: 'center' }}
              />
              <button className="btn btn-ghost" style={{ border: '1px solid var(--border)' }} onClick={handleJoinRoom}>
                Vào phòng
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: PHÒNG THI ĐẤU PVP REALTIME
  // ==========================================
  return (
    <div className="game-page">
      <div className="game-layout">

        {/* SIDEBAR TRÁI: THÔNG TIN PHÒNG & NÚT HÀNH ĐỘNG */}
        <aside className="game-sidebar animate-slide-left">
          {/* Room info card */}
          <div className="glass-card game-panel">
            <div className="game-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Mã phòng đấu</span>
              <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Radio size={12} className="animate-pulse" color="var(--success)" /> Live
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--accent-primary)' }}>
                {currentRoomId}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={copyRoomCode} title="Copy mã phòng">
                {isCopied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              Gửi mã này cho bạn bè để họ nhập và vào chiến cùng bạn.
            </p>
          </div>

          {/* Match controls */}
          <div className="glass-card game-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className="game-panel-title">Điều khiển ván đấu</div>
            
            <button className="btn btn-danger btn-sm" onClick={handleResign} disabled={!gameStarted || !!gameResult}>
              <Flag size={14} /> Xin thua
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleLeaveRoom} style={{ color: 'var(--text-muted)' }}>
              <LogOut size={14} /> Rời phòng
            </button>
          </div>
        </aside>

        {/* BÀN CỜ Ở GIỮA */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          
          {/* Thông báo trạng thái */}
          {statusMsg && (
            <div className="game-status thinking" style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
              {statusMsg}
            </div>
          )}

          {/* ĐỐI THỦ (TOP) */}
          <div className="player-info" style={{ maxWidth: 560, width: '100%' }}>
            <div className={`player-avatar ${myColor === 'white' ? 'player-piece-black' : 'player-piece-white'}`}>
              {opponentName ? opponentName[0].toUpperCase() : '⏳'}
            </div>
            <div>
              <div className="player-name">{opponentName || 'Đang chờ đối thủ vào...'}</div>
              <div className="player-elo">
                Quân {myColor === 'white' ? 'Đen ⬛' : 'Trắng ⬜'}
              </div>
            </div>
            <div className={`player-timer ${gameStarted && game.turn() !== myColor[0] ? 'active' : ''}`}>
              {formatTime(myColor === 'white' ? blackTime : whiteTime)}
            </div>
          </div>

          {/* BÀN CỜ CHESSBOARD */}
          <div className="board-container" style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
            <Chessboard
              options={{
                position: fen,
                onPieceDrop: ({ sourceSquare, targetSquare, piece }) => {
                  if (!targetSquare) return false;
                  return onDrop(sourceSquare, targetSquare, piece.pieceType);
                },
                boardOrientation: myColor, // Bàn cờ tự xoay theo màu của mình
                boardStyle: { borderRadius: '8px' },
                darkSquareStyle: { backgroundColor: '#4a7c59' },
                lightSquareStyle: { backgroundColor: '#f0d9b5' },
                animationDurationInMs: 180,
                allowDragging: gameStarted && !gameResult && game.turn() === myColor[0],
                canDragPiece: ({ piece }) => {
                  if (!gameStarted || gameResult) return false;
                  return piece?.pieceType ? piece.pieceType.startsWith(myColor === 'white' ? 'w' : 'b') : false;
                },
              }}
            />
          </div>

          {/* BẢN THÂN NGƯỜI CHƠI (BOTTOM) */}
          <div className="player-info" style={{ maxWidth: 560, width: '100%' }}>
            <div className={`player-avatar ${myColor === 'white' ? 'player-piece-white' : 'player-piece-black'}`}>
              {user?.username ? user.username[0].toUpperCase() : '👤'}
            </div>
            <div>
              <div className="player-name">{user?.username || 'Bạn'} (Bạn)</div>
              <div className="player-elo">
                {user?.eloRating || 1200} ELO · Quân {myColor === 'white' ? 'Trắng ⬜' : 'Đen ⬛'}
              </div>
            </div>
            <div className={`player-timer ${gameStarted && game.turn() === myColor[0] ? 'active' : ''}`}>
              {formatTime(myColor === 'white' ? whiteTime : blackTime)}
            </div>
          </div>
        </main>

        {/* SIDEBAR PHẢI: LỊCH SỬ NƯỚC ĐI & CHAT REALTIME */}
        <aside className="game-sidebar animate-slide-right">
          <div className="glass-card game-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 560 }}>
            {/* Tabs chuyển đổi */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <button
                className={`btn btn-sm ${activeTab === 'moves' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setActiveTab('moves')}
              >
                <ScrollText size={14} /> Nước đi
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'chat' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1 }}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={14} /> Trò chuyện
              </button>
            </div>

            {/* TAB 1: NƯỚC ĐI */}
            {activeTab === 'moves' ? (
              <div className="move-list" ref={moveScrollRef} style={{ flex: 1 }}>
                {movePairs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 1rem' }}>
                    Chưa có nước đi nào
                  </p>
                ) : (
                  movePairs.map(([white, black], i) => (
                    <div key={i} className="move-row">
                      <span className="move-num">{i + 1}.</span>
                      <span className="move-san">{white}</span>
                      <span className="move-san">{black || ''}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* TAB 2: CHAT BOX */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                  {chatMessages.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
                      Gửi tin nhắn chào đối thủ nào! 👋
                    </p>
                  ) : (
                    chatMessages.map((c, idx) => {
                      const isMe = c.sender === user?.username;
                      return (
                        <div
                          key={idx}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            background: isMe ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: isMe ? '#fff' : 'var(--text-primary)',
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.82rem',
                          }}
                        >
                          <div style={{ fontSize: '0.65rem', opacity: 0.75, marginBottom: 2 }}>
                            {isMe ? 'Bạn' : c.sender} · {c.time}
                          </div>
                          <div>{c.text}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={sendChat} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nhập tin nhắn..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm btn-icon">
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* MODAL KẾT QUẢ VÁN ĐẤU */}
      {gameResult && (
        <div className="modal-overlay">
          <div className="glass-card modal animate-scale-up">
            <span className="modal-icon">
              {gameResult === 'WIN' ? '🏆' : gameResult === 'LOSS' ? '💀' : '🤝'}
            </span>
            <h2 className="modal-title" style={{
              color: gameResult === 'WIN' ? 'var(--success)' : gameResult === 'LOSS' ? 'var(--danger)' : 'var(--draw)'
            }}>
              {gameResult === 'WIN' ? 'Bạn Thắng Trận!' : gameResult === 'LOSS' ? 'Bạn Thua Trận!' : 'Hòa Cờ!'}
            </h2>
            <p className="modal-subtitle">{statusMsg}</p>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleLeaveRoom}>
                🚪 Rời phòng & Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Xem game review */}
       {gameResult && (
        <div className="modal-overlay">
          <div className="glass-card modal animate-scale-up">
            <span className="modal-icon">
              📊
            </span>
            <h2 className="modal-title">Xem Review Ván Đấu</h2>
            <p className="modal-subtitle">Xem lại các nước đi của ván đấu vừa rồi</p>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              {/* Giữ nguyên nút bấm của bạn, hành động nhảy trang đã được xử lý trong hàm handleLeaveRoom */}
              <button className="btn btn-primary" onClick={handleReview}>
                📊 Xem Review Ván Đấu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
