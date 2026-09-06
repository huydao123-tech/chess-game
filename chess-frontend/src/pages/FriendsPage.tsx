import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { 
  Users, UserPlus, Send, Ban, Check, X, ShieldAlert, Swords, 
  Search, RefreshCw, Clock, AlertCircle, CheckCircle2
} from 'lucide-react';
import { friendAPI, presenceAPI } from '../api';
import type { FriendDTO, FriendRequestDTO } from '../api';
import { useAuthStore } from '../store/authStore';
import '../styles/global.css';

type TabType = 'FRIENDS' | 'RECEIVED' | 'SENT' | 'BLOCKED';

const TIME_OPTIONS = [
  { label: '3 phút (Blitz)', seconds: 180, icon: '⚡' },
  { label: '5 phút (Rapid)', seconds: 300, icon: '⏱️' },
  { label: '10 phút', seconds: 600, icon: '🕒' },
  { label: '15 phút', seconds: 900, icon: '⏳' },
];

export default function FriendsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('FRIENDS');

  const [friends, setFriends] = useState<FriendDTO[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestDTO[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestDTO[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<FriendDTO[]>([]);

  const [loading, setLoading] = useState(false);
  const [targetUserIdInput, setTargetUserIdInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Challenge Setup Modal State
  const [challengeTarget, setChallengeTarget] = useState<FriendDTO | null>(null);
  const [selectedTimeControl, setSelectedTimeControl] = useState<number>(300);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [friendsRes, receivedRes, sentRes, blockedRes, onlineUsersRes] = await Promise.allSettled([
        friendAPI.getFriendsList(),
        friendAPI.getReceivedFriendRequests(),
        friendAPI.getSentFriendRequests(),
        friendAPI.getBlockedUsers(),
        presenceAPI.getOnlineUsers(),
      ]);

      const onlineUserIds = new Set<number>(
        onlineUsersRes.status === 'fulfilled' ? onlineUsersRes.value.data : []
      );

      if (friendsRes.status === 'fulfilled') {
        const mappedFriends = friendsRes.value.data.map(f => ({
          ...f,
          isOnline: onlineUserIds.has(f.friendId) || f.isOnline || false,
        }));
        setFriends(mappedFriends);
      }
      if (receivedRes.status === 'fulfilled') setReceivedRequests(receivedRes.value.data);
      if (sentRes.status === 'fulfilled') setSentRequests(sentRes.value.data);
      if (blockedRes.status === 'fulfilled') setBlockedUsers(blockedRes.value.data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bạn bè:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Listen to real-time presence updates from WebSocket (dispatched by ChallengeModal)
    const handlePresenceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: number; username: string; isOnline: boolean }>;
      const { userId, isOnline } = customEvent.detail;

      setFriends((prevFriends) =>
        prevFriends.map((f) => (f.friendId === userId ? { ...f, isOnline } : f))
      );
    };

    window.addEventListener('presence_update', handlePresenceUpdate);
    return () => {
      window.removeEventListener('presence_update', handlePresenceUpdate);
    };
  }, []);

  const handleSendFriendRequest = async (e: FormEvent) => {
    e.preventDefault();
    const idNum = Number(targetUserIdInput.trim());
    if (!idNum || isNaN(idNum)) {
      showToast('Vui lòng nhập ID người dùng hợp lệ', 'error');
      return;
    }
    if (user && user.id === idNum) {
      showToast('Bạn không thể gửi lời mời cho chính mình!', 'error');
      return;
    }

    setActionLoadingId('send_request');
    try {
      await friendAPI.sendFriendRequest(idNum);
      showToast(`Đã gửi lời mời kết bạn tới người dùng #${idNum}!`, 'success');
      setTargetUserIdInput('');
      fetchAllData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi gửi lời mời kết bạn';
      showToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: number, username: string) => {
    setActionLoadingId(`accept_${friendshipId}`);
    try {
      await friendAPI.acceptFriendRequest(friendshipId);
      showToast(`Đã trở thành bạn bè với ${username}!`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể chấp nhận lời mời', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (friendshipId: number) => {
    setActionLoadingId(`reject_${friendshipId}`);
    try {
      await friendAPI.rejectFriendRequest(friendshipId);
      showToast('Đã từ chối lời mời kết bạn', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể từ chối lời mời', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (friendshipId: number) => {
    setActionLoadingId(`cancel_${friendshipId}`);
    try {
      await friendAPI.cancelFriendRequest(friendshipId);
      showToast('Đã thu hồi lời mời kết bạn', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể thu hồi lời mời', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnfriend = async (friendId: number, username: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy kết bạn với ${username}?`)) return;
    setActionLoadingId(`unfriend_${friendId}`);
    try {
      await friendAPI.unfriend(friendId);
      showToast(`Đã hủy kết bạn với ${username}`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể hủy kết bạn', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlockUser = async (targetUserId: number, username: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn chặn ${username}? Người này sẽ không thể gửi lời mời hoặc nhắn tin cho bạn.`)) return;
    setActionLoadingId(`block_${targetUserId}`);
    try {
      await friendAPI.blockUser(targetUserId);
      showToast(`Đã chặn người dùng ${username}`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể chặn người dùng', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblockUser = async (targetUserId: number, username: string) => {
    setActionLoadingId(`unblock_${targetUserId}`);
    try {
      await friendAPI.unblockUser(targetUserId);
      showToast(`Đã bỏ chặn ${username}`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể bỏ chặn', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Challenge Modal
  const handleOpenChallengeSetup = (friend: FriendDTO) => {
    setChallengeTarget(friend);
  };

  // Confirm sending challenge via WebSocket event
  const handleConfirmChallenge = () => {
    if (!challengeTarget || !user) return;

    window.dispatchEvent(
      new CustomEvent('send_friend_challenge', {
        detail: {
          challengerId: user.id,
          challengerUsername: user.username,
          challengerAvatarUrl: user.avatarUrl,
          challengerElo: user.eloRating,
          targetUserId: challengeTarget.friendId,
          targetUsername: challengeTarget.username,
          timeControl: selectedTimeControl,
        },
      })
    );

    setChallengeTarget(null);
  };

  // Filtered lists by search query
  const filteredFriends = friends.filter(f => 
    !searchQuery || f.username.toLowerCase().includes(searchQuery.toLowerCase()) || String(f.friendId).includes(searchQuery)
  );

  const filteredReceived = receivedRequests.filter(r => 
    !searchQuery || r.requesterUsername.toLowerCase().includes(searchQuery.toLowerCase()) || String(r.requesterId).includes(searchQuery)
  );

  const filteredSent = sentRequests.filter(s => 
    !searchQuery || s.receiverUsername.toLowerCase().includes(searchQuery.toLowerCase()) || String(s.receiverId).includes(searchQuery)
  );

  const filteredBlocked = blockedUsers.filter(b => 
    !searchQuery || b.username.toLowerCase().includes(searchQuery.toLowerCase()) || String(b.friendId).includes(searchQuery)
  );

  const tabs = [
    { id: 'FRIENDS', label: 'Bạn bè', icon: Users, count: friends.length },
    { id: 'RECEIVED', label: 'Lời mời nhận được', icon: UserPlus, count: receivedRequests.length, highlight: receivedRequests.length > 0 },
    { id: 'SENT', label: 'Lời mời đã gửi', icon: Send, count: sentRequests.length },
    { id: 'BLOCKED', label: 'Đã chặn', icon: Ban, count: blockedUsers.length },
  ];

  return (
    <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: 1280, margin: '0 auto' }}>
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 90,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: toastMessage.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.3s ease',
            fontWeight: 500,
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. HERO HEADER BANNER */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '2.5rem 2rem', 
          marginBottom: '2rem', 
          position: 'relative', 
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: 'linear-gradient(135deg, rgba(26, 37, 64, 0.8) 0%, rgba(15, 22, 41, 0.95) 100%)',
          borderColor: 'var(--border)'
        }}
      >
        <div style={{ position: 'absolute', right: '-2%', top: '-25%', opacity: 0.04, fontSize: '16rem', pointerEvents: 'none' }}>
          ♟
        </div>

        <div style={{ zIndex: 1, maxWidth: 600 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.8rem', borderRadius: 100, background: 'var(--accent-glow)', border: '1px solid rgba(91, 138, 240, 0.3)', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            <Users size={14} /> Mạng xã hội Cờ Vua
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Cộng Đồng & Bạn Bè
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
            Kết nối bạn bè, giao lưu học hỏi và thách đấu các kỳ thủ trực tuyến theo thời gian thực.
          </p>
        </div>

        {/* Quick Add Friend Form */}
        <form onSubmit={handleSendFriendRequest} style={{ zIndex: 1, display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <UserPlus size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="number"
              className="form-input"
              placeholder="Nhập ID kỳ thủ để kết bạn..."
              value={targetUserIdInput}
              onChange={(e) => setTargetUserIdInput(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: 260, height: 44 }}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={actionLoadingId === 'send_request'}
            style={{ height: 44, padding: '0 1.25rem' }}
          >
            {actionLoadingId === 'send_request' ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang gửi...</>
            ) : (
              <><Send size={16} /> Kết bạn</>
            )}
          </button>
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={fetchAllData} 
            title="Làm mới dữ liệu"
            style={{ height: 44, width: 44, padding: 0 }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      {/* 2. TABS & SEARCH BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className="btn btn-sm"
                style={{
                  background: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? '0 4px 15px var(--accent-glow)' : 'none',
                  padding: '0.6rem 1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'var(--transition)'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span 
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : tab.highlight ? 'var(--danger)' : 'var(--bg-tertiary)',
                      color: isActive || tab.highlight ? '#ffffff' : 'var(--text-muted)',
                      padding: '0.1rem 0.5rem',
                      borderRadius: 100,
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search in tab */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo tên hoặc ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', height: 42, fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {loading && friends.length === 0 && receivedRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách bạn bè & lời mời...</p>
        </div>
      ) : (
        <div>

          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'FRIENDS' && (
            filteredFriends.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>👥</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                  {searchQuery ? 'Không tìm thấy bạn bè nào phù hợp' : 'Chưa có bạn bè nào'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
                  {searchQuery ? 'Hãy thử tìm kiếm với từ khóa khác.' : 'Nhập ID người chơi ở thanh phía trên để gửi lời mời kết bạn và xây dựng mạng lưới kỳ thủ của bạn!'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.25rem' }}>
                {filteredFriends.map((friend) => (
                  <div 
                    key={friend.friendshipId} 
                    className="glass-card"
                    style={{ 
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      position: 'relative'
                    }}
                  >
                    {/* Header profile info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ position: 'relative' }}>
                        {friend.avatarUrl ? (
                          <img 
                            src={friend.avatarUrl} 
                            alt={friend.username} 
                            style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                          />
                        ) : (
                          <div 
                            style={{
                              width: 52, height: 52, borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--accent-primary), #9c88ff)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', flexShrink: 0
                            }}
                          >
                            {friend.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Online/Offline status dot indicator */}
                        <div 
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            backgroundColor: friend.isOnline ? '#10b981' : '#6b7280',
                            border: '2px solid var(--bg-card)',
                            boxShadow: friend.isOnline ? '0 0 8px #10b981' : 'none',
                          }}
                          title={friend.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {friend.username}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{friend.friendId}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
                          <span className="elo-badge">
                            ♟ {friend.eloRating || 1200} ELO
                          </span>
                          <span 
                            style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              color: friend.isOnline ? 'var(--success)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            {friend.isOnline ? '🟢 Trực tuyến' : '⚪ Ngoại tuyến'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '0.5rem', 
                        background: 'var(--bg-tertiary)', 
                        padding: '0.75rem', 
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Ván đấu</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{friend.totalGames || 0}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--success)' }}>Thắng</div>
                        <div style={{ fontWeight: 700, color: 'var(--success)' }}>{friend.wins || 0}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--danger)' }}>Thua</div>
                        <div style={{ fontWeight: 700, color: 'var(--danger)' }}>{friend.losses || 0}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        style={{ 
                          flex: 1, 
                          background: friend.isOnline 
                            ? 'linear-gradient(135deg, var(--accent-primary), #4a7adf)' 
                            : 'var(--bg-tertiary)',
                          color: friend.isOnline ? '#ffffff' : 'var(--text-muted)',
                          borderColor: friend.isOnline ? 'transparent' : 'var(--border)'
                        }}
                        onClick={() => handleOpenChallengeSetup(friend)}
                        title="Thách đấu cờ trực tuyến"
                      >
                        <Swords size={14} /> Thách đấu
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleUnfriend(friend.friendId, friend.username)}
                        disabled={actionLoadingId === `unfriend_${friend.friendId}`}
                        title="Hủy kết bạn"
                      >
                        <X size={14} /> Hủy kết bạn
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--text-muted)' }}
                        onClick={() => handleBlockUser(friend.friendId, friend.username)}
                        title="Chặn người dùng này"
                      >
                        <Ban size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 2: RECEIVED REQUESTS */}
          {activeTab === 'RECEIVED' && (
            filteredReceived.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📬</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Không có lời mời kết bạn nào</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto', fontSize: '0.95rem' }}>
                  Khi có người chơi khác gửi lời mời kết bạn cho bạn, yêu cầu sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {filteredReceived.map((req) => (
                  <div 
                    key={req.friendshipId} 
                    className="glass-card"
                    style={{ 
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      border: '1px solid rgba(91, 138, 240, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {req.requesterAvatarUrl ? (
                        <img 
                          src={req.requesterAvatarUrl} 
                          alt={req.requesterUsername} 
                          style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div 
                          style={{
                            width: 52, height: 52, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-primary), #9c88ff)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', flexShrink: 0
                          }}
                        >
                          {req.requesterUsername.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.requesterUsername}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{req.requesterId}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span className="elo-badge">
                            ♟ {req.requesterElo || 1200} ELO
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} />
                      <span>Đã gửi: {new Date(req.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-success btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleAcceptRequest(req.friendshipId, req.requesterUsername)}
                        disabled={actionLoadingId === `accept_${req.friendshipId}`}
                      >
                        <Check size={14} /> Chấp nhận
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1, color: 'var(--danger)' }}
                        onClick={() => handleRejectRequest(req.friendshipId)}
                        disabled={actionLoadingId === `reject_${req.friendshipId}`}
                      >
                        <X size={14} /> Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 3: SENT REQUESTS */}
          {activeTab === 'SENT' && (
            filteredSent.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📤</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Chưa gửi lời mời nào</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto', fontSize: '0.95rem' }}>
                  Bạn chưa có lời mời kết bạn nào đang chờ đối phương phản hồi.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {filteredSent.map((req) => (
                  <div 
                    key={req.friendshipId} 
                    className="glass-card"
                    style={{ 
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {req.receiverAvatarUrl ? (
                        <img 
                          src={req.receiverAvatarUrl} 
                          alt={req.receiverUsername} 
                          style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', opacity: 0.8 }}
                        />
                      ) : (
                        <div 
                          style={{
                            width: 52, height: 52, borderRadius: '50%',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0
                          }}
                        >
                          {req.receiverUsername.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.receiverUsername}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{req.receiverId}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span className="elo-badge" style={{ background: 'rgba(255, 183, 77, 0.1)', color: 'var(--warning)', borderColor: 'rgba(255, 183, 77, 0.3)' }}>
                            ⏳ Đang chờ phản hồi...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} />
                      <span>Đã gửi lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}</span>
                    </div>

                    <button 
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', width: '100%' }}
                      onClick={() => handleCancelRequest(req.friendshipId)}
                      disabled={actionLoadingId === `cancel_${req.friendshipId}`}
                    >
                      <X size={14} /> Thu hồi lời mời
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 4: BLOCKED USERS */}
          {activeTab === 'BLOCKED' && (
            filteredBlocked.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Danh sách chặn trống</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto', fontSize: '0.95rem' }}>
                  Bạn chưa chặn bất kỳ kỳ thủ nào.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {filteredBlocked.map((blocked) => (
                  <div 
                    key={blocked.friendshipId} 
                    className="glass-card"
                    style={{ 
                      padding: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      borderColor: 'rgba(239, 83, 80, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div 
                        style={{
                          width: 46, height: 46, borderRadius: '50%',
                          background: 'rgba(239, 83, 80, 0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--danger)', flexShrink: 0
                        }}
                      >
                        <ShieldAlert size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{blocked.username}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Đã bị chặn</span>
                      </div>
                    </div>

                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleUnblockUser(blocked.friendId, blocked.username)}
                      disabled={actionLoadingId === `unblock_${blocked.friendId}`}
                    >
                      Bỏ chặn
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      )}

      {/* CHALLENGE SETUP MODAL */}
      {challengeTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99990,
            backgroundColor: 'rgba(5, 8, 18, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 460,
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
              border: '1px solid var(--border-hover)',
              animation: 'slideInLeft 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-primary), #9c88ff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <Swords size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Thách Đấu Bạn Bè</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Đối thủ: <strong style={{ color: 'var(--text-primary)' }}>{challengeTarget.username}</strong>
                  </p>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setChallengeTarget(null)}
                style={{ width: 36, height: 36, padding: 0, borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Friend info card */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cấp độ Elo</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  ♟ {challengeTarget.eloRating || 1200}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trạng thái</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: challengeTarget.isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
                  {challengeTarget.isOnline ? '🟢 Đang trực tuyến' : '⚪ Ngoại tuyến'}
                </div>
              </div>
            </div>

            {/* Time Control Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Chọn thời gian ván đấu:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t.seconds}
                    type="button"
                    onClick={() => setSelectedTimeControl(t.seconds)}
                    className="btn"
                    style={{
                      background: selectedTimeControl === t.seconds ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                      border: selectedTimeControl === t.seconds ? '1.5px solid var(--accent-primary)' : '1px solid var(--border)',
                      color: selectedTimeControl === t.seconds ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: selectedTimeControl === t.seconds ? 700 : 500,
                      padding: '0.8rem 1rem',
                      justifyContent: 'flex-start',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Send button */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
                onClick={handleConfirmChallenge}
              >
                <Send size={18} /> Gửi lời thách đấu
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setChallengeTarget(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
