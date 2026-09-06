import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Swords, Check, X, Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { ChallengeEvent } from '../api';
import '../styles/global.css';

export default function ChallengeModal() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Incoming challenge state
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengeEvent | null>(null);

  // Outgoing challenge waiting state
  const [outgoingChallenge, setOutgoingChallenge] = useState<ChallengeEvent | null>(null);

  // Toast / Alert notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const stompClientRef = useRef<Client | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast(({ type, text }));
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      return;
    }

    // Connect to WebSocket STOMP
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      debug: () => {}, // silence stomp logs in production
      onConnect: () => {
        // 1. Register online presence
        client.publish({
          destination: '/app/presence/online',
          body: JSON.stringify({ userId: user.id, username: user.username }),
        });

        // 2. Subscribe to presence updates
        client.subscribe('/topic/presence', (message: IMessage) => {
          try {
            const payload = JSON.parse(message.body);
            window.dispatchEvent(new CustomEvent('presence_update', { detail: payload }));
          } catch (e) {
            console.error('Lỗi parse presence', e);
          }
        });

        // 3. Subscribe to personal challenge topic
        client.subscribe(`/topic/user/${user.id}/challenge`, (message: IMessage) => {
          try {
            const event: ChallengeEvent = JSON.parse(message.body);
            handleChallengeEvent(event);
          } catch (e) {
            console.error('Lỗi parse challenge event', e);
          }
        });
      },
    });

    client.activate();
    stompClientRef.current = client;

    // Listen to custom event when user sends a challenge from FriendsPage
    const handleSendChallengeFromUI = (e: Event) => {
      const customEvent = e as CustomEvent<ChallengeEvent>;
      const challengeData = customEvent.detail;
      if (client && client.connected) {
        client.publish({
          destination: '/app/challenge/send',
          body: JSON.stringify(challengeData),
        });
        setOutgoingChallenge(challengeData);
      } else {
        showToast('Không thể kết nối máy chủ thách đấu!', 'error');
      }
    };

    window.addEventListener('send_friend_challenge', handleSendChallengeFromUI);

    return () => {
      window.removeEventListener('send_friend_challenge', handleSendChallengeFromUI);
      if (client) {
        client.deactivate();
        stompClientRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id]);

  const handleChallengeEvent = (event: ChallengeEvent) => {
    switch (event.type) {
      case 'CHALLENGE_RECEIVED':
        setIncomingChallenge(event);
        break;

      case 'CHALLENGE_DECLINED':
        setOutgoingChallenge(null);
        showToast(event.message || 'Đối phương đã từ chối lời thách đấu.', 'warning');
        break;

      case 'CHALLENGE_CANCELLED':
        setIncomingChallenge(null);
        showToast('Lời thách đấu đã được người gửi thu hồi.', 'warning');
        break;

      case 'CHALLENGE_FAILED_OFFLINE':
        setIncomingChallenge(null);
        setOutgoingChallenge(null);
        showToast(event.message || 'Người gửi thách đấu đã offline / không còn trực tuyến!', 'error');
        break;

      case 'CHALLENGE_START':
        setIncomingChallenge(null);
        setOutgoingChallenge(null);
        showToast('⚔️ Đang chuyển vào phòng thi đấu...', 'success');
        navigate('/online', {
          state: {
            roomId: event.roomId,
            isHost: event.isHost,
            timeControl: event.timeControl || 300,
            opponentName: event.opponentUsername,
          },
        });
        break;
    }
  };

  const handleAccept = () => {
    if (!incomingChallenge || !stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: '/app/challenge/accept',
      body: JSON.stringify({
        challengeId: incomingChallenge.challengeId,
        targetUserId: user?.id,
      }),
    });
    setIncomingChallenge(null);
  };

  const handleDecline = () => {
    if (!incomingChallenge || !stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: '/app/challenge/decline',
      body: JSON.stringify({
        challengeId: incomingChallenge.challengeId,
        targetUserId: user?.id,
      }),
    });
    setIncomingChallenge(null);
  };

  const handleCancelOutgoing = () => {
    if (!outgoingChallenge || !stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: '/app/challenge/cancel',
      body: JSON.stringify({
        challengeId: outgoingChallenge.challengeId,
        challengerId: user?.id,
      }),
    });
    setOutgoingChallenge(null);
    showToast('Đã hủy lời thách đấu.', 'warning');
  };

  return (
    <>
      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 85,
            right: 24,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background:
              toast.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : toast.type === 'warning'
                ? 'rgba(245, 158, 11, 0.95)'
                : 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(15px)',
            animation: 'fadeIn 0.3s ease',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={22} />
          ) : toast.type === 'warning' ? (
            <AlertTriangle size={22} />
          ) : (
            <AlertCircle size={22} />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. INCOMING CHALLENGE MODAL POPUP */}
      {incomingChallenge && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99998,
            backgroundColor: 'rgba(5, 8, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 450,
              width: '100%',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 40px var(--accent-glow)',
              border: '1px solid var(--accent-primary)',
              animation: 'slideInLeft 0.3s ease',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), #9c88ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 0 25px var(--accent-glow)',
              }}
            >
              <Swords size={36} color="#ffffff" />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Lời Thách Đấu Mới!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Kỳ thủ <strong style={{ color: 'var(--accent-primary)' }}>{incomingChallenge.challengerUsername}</strong> muốn thách đấu một ván cờ với bạn.
            </p>

            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-around',
                marginBottom: '2rem',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ELO Đối thủ</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  ♟ {incomingChallenge.challengerElo || 1200}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)' }}></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thời gian</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                  <Clock size={16} />
                  {Math.floor((incomingChallenge.timeControl || 300) / 60)} phút
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-success btn-lg"
                style={{ flex: 1, padding: '0.9rem', fontSize: '1rem' }}
                onClick={handleAccept}
              >
                <Check size={18} /> Chấp nhận
              </button>
              <button
                className="btn btn-ghost btn-lg"
                style={{ flex: 1, padding: '0.9rem', fontSize: '1rem', color: 'var(--danger)' }}
                onClick={handleDecline}
              >
                <X size={18} /> Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. OUTGOING CHALLENGE WAITING MODAL */}
      {outgoingChallenge && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99998,
            backgroundColor: 'rgba(5, 8, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 420,
              width: '100%',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div className="spinner" style={{ width: 56, height: 56, borderWidth: 3, margin: '0 auto 1.5rem' }} />
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Đang Chờ Phản Hồi...
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              Đang gửi lời thách đấu tới <strong style={{ color: 'var(--accent-primary)' }}>{outgoingChallenge.targetUsername || 'bạn bè'}</strong>. Trận đấu sẽ tự động bắt đầu khi đối phương chấp nhận.
            </p>

            <button
              className="btn btn-ghost"
              style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(239, 83, 80, 0.3)' }}
              onClick={handleCancelOutgoing}
            >
              <X size={16} /> Hủy lời thách đấu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
