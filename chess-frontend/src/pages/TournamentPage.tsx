import { useState, useEffect } from 'react';
import { 
  Trophy, Plus, Clock, Calendar, Search, 
  Check, Copy, AlertCircle, Sparkles, Swords, RefreshCw, X, Globe, Eye, Users, 
  Play, CheckCircle2
} from 'lucide-react';
import { 
  tournamentAPI, 
  type TournamentDTO, 
  type TournamentStatus, 
  type CreateTournamentRoomRequestDTO,
  type TournamentDetailDTO,
  type TournamentMatchDTO
} from '../api';
import { useAuthStore } from '../store/authStore';

const TIME_PRESETS = [
  { label: '1m Bullet', seconds: 60, desc: 'Siêu tốc' },
  { label: '3m Blitz', seconds: 180, desc: 'Cờ chớp' },
  { label: '5m Blitz', seconds: 300, desc: 'Cờ chớp' },
  { label: '10m Rapid', seconds: 600, desc: 'Cờ nhanh' },
  { label: '15m Rapid', seconds: 900, desc: 'Cờ nhanh' },
  { label: '30m Classical', seconds: 1800, desc: 'Cờ tiêu chuẩn' },
];

const STATUS_LIST: { key: TournamentStatus | 'ALL'; label: string; color: string }[] = [
  { key: 'ALL', label: 'Tất cả', color: 'var(--accent-primary)' },
  { key: 'REGISTRATION', label: 'Đang mở đăng ký', color: 'var(--success)' },
  { key: 'READY', label: 'Sẵn sàng bắt đầu', color: 'var(--accent-primary)' },
  { key: 'ONGOING', label: 'Đang diễn ra', color: '#ff7043' },
  { key: 'FULL', label: 'Đã đủ người', color: 'var(--danger)' },
  { key: 'DRAFT', label: 'Bản nháp (DRAFT)', color: '#9c88ff' },
  { key: 'FINISHED', label: 'Đã kết thúc', color: 'var(--text-muted)' },
];

function getStatusBadge(status: TournamentStatus) {
  switch (status) {
    case 'REGISTRATION':
      return <span className="badge" style={{ background: 'rgba(76, 175, 130, 0.2)', color: 'var(--success)', border: '1px solid rgba(76, 175, 130, 0.4)' }}>🟢 Đang mở đăng ký</span>;
    case 'ONGOING':
      return <span className="badge" style={{ background: 'rgba(255, 112, 67, 0.2)', color: '#ff7043', border: '1px solid rgba(255, 112, 67, 0.4)' }}>⚔️ Đang diễn ra</span>;
    case 'UPCOMING':
      return <span className="badge" style={{ background: 'rgba(255, 183, 77, 0.2)', color: 'var(--warning)', border: '1px solid rgba(255, 183, 77, 0.4)' }}>⏳ Sắp diễn ra</span>;
    case 'DRAFT':
      return <span className="badge" style={{ background: 'rgba(156, 136, 255, 0.2)', color: '#9c88ff', border: '1px solid rgba(156, 136, 255, 0.4)' }}>📝 Bản nháp</span>;
    case 'READY':
      return <span className="badge" style={{ background: 'rgba(91, 138, 240, 0.2)', color: 'var(--accent-primary)', border: '1px solid rgba(91, 138, 240, 0.4)' }}>✨ Sẵn sàng</span>;
    case 'FULL':
      return <span className="badge" style={{ background: 'rgba(239, 83, 80, 0.2)', color: 'var(--danger)', border: '1px solid rgba(239, 83, 80, 0.4)' }}>🔴 Đã đủ người</span>;
    case 'FINISHED':
      return <span className="badge" style={{ background: 'rgba(139, 152, 184, 0.2)', color: 'var(--text-secondary)' }}>🏁 Đã kết thúc</span>;
    case 'CANCELLED':
      return <span className="badge" style={{ background: 'rgba(239, 83, 80, 0.15)', color: 'var(--danger)' }}>❌ Đã hủy</span>;
    default:
      return <span className="badge">{status}</span>;
  }
}

function formatDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateTimeStr;
  }
}

function formatTimeControl(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m} phút`;
}

function toDatetimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function TournamentPage() {
  const currentUser = useAuthStore((s) => s.user);

  // === STATE ===
  const [tournaments, setTournaments] = useState<TournamentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TournamentStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading state cho các actions
  const [actionLoadingId, setActionLoadingId] = useState<{ id: number; action: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Tạo giải đấu
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState<TournamentDTO | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Form State
  const [tournamentName, setTournamentName] = useState('');
  const [timeControl, setTimeControl] = useState(300);
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [format, setFormat] = useState<'SINGLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS'>('SINGLE_ELIMINATION');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return toDatetimeLocalString(d);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date(Date.now() + 150 * 60 * 1000);
    return toDatetimeLocalString(d);
  });

  // Modal Chi tiết & Bracket
  const [selectedTournamentDetail, setSelectedTournamentDetail] = useState<TournamentDetailDTO | null>(null);
  const [detailBracket, setDetailBracket] = useState<TournamentMatchDTO[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'INFO' | 'PARTICIPANTS' | 'BRACKET'>('INFO');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Tải danh sách giải đấu
  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await tournamentAPI.getTournaments();
      if (Array.isArray(res.data)) {
        setTournaments(res.data);
      }
    } catch (err) {
      console.warn('Could not load tournaments from server', err);
    } finally {
      setLoading(false);
    }
  };

  // Xem chi tiết giải đấu
  const handleOpenDetail = async (id: number, initialTab: 'INFO' | 'PARTICIPANTS' | 'BRACKET' = 'INFO') => {
    setActiveDetailTab(initialTab);
    setDetailLoading(true);
    try {
      const [detailRes, bracketRes] = await Promise.all([
        tournamentAPI.getTournamentDetail(id),
        tournamentAPI.getBracket(id).catch(() => ({ data: [] })),
      ]);
      setSelectedTournamentDetail(detailRes.data);
      setDetailBracket(bracketRes.data);
    } catch (err: any) {
      console.error('Lỗi tải chi tiết giải đấu:', err);
      showToast('Không thể tải chi tiết giải đấu', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // 1. Mở đăng ký: DRAFT -> REGISTRATION
  const handleOpenRegistration = async (id: number) => {
    setActionLoadingId({ id, action: 'open' });
    try {
      const response = await tournamentAPI.openRegistration(id);
      const updated = response.data;
      setTournaments((prev) => prev.map((t) => t.id === id ? { ...t, status: updated.status } : t));
      if (createdSuccess && createdSuccess.id === id) {
        setCreatedSuccess({ ...createdSuccess, status: updated.status });
      }
      if (selectedTournamentDetail && selectedTournamentDetail.id === id) {
        setSelectedTournamentDetail({ ...selectedTournamentDetail, status: updated.status });
      }
      showToast(`Đã mở đăng ký giải đấu #${id}!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi mở đăng ký';
      showToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Tham gia: -> REGISTRATION / FULL
  const handleJoinTournament = async (id: number) => {
    setActionLoadingId({ id, action: 'join' });
    try {
      const response = await tournamentAPI.joinTournament(id);
      const updated = response.data;
      setTournaments((prev) => prev.map((t) => t.id === id ? { 
        ...t, 
        status: updated.status, 
        currentParticipantsCount: updated.currentParticipantsCount 
      } : t));
      if (selectedTournamentDetail && selectedTournamentDetail.id === id) {
        handleOpenDetail(id, 'PARTICIPANTS');
      }
      showToast(`Bạn đã tham gia giải đấu #${id} thành công!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể tham gia giải đấu';
      showToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Rút lui
  const handleLeaveTournament = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn rút lui khỏi giải đấu này không?')) return;
    setActionLoadingId({ id, action: 'leave' });
    try {
      const response = await tournamentAPI.leaveTournament(id);
      const updated = response.data;
      setTournaments((prev) => prev.map((t) => t.id === id ? { 
        ...t, 
        status: updated.status, 
        currentParticipantsCount: updated.currentParticipantsCount 
      } : t));
      if (selectedTournamentDetail && selectedTournamentDetail.id === id) {
        handleOpenDetail(id, 'PARTICIPANTS');
      }
      showToast(`Đã rút lui khỏi giải đấu #${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi rút lui';
      showToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Chốt danh sách: REGISTRATION/FULL -> READY
  const handleReadyToStart = async (id: number) => {
    setActionLoadingId({ id, action: 'ready' });
    try {
      const response = await tournamentAPI.readyToStart(id);
      const updated = response.data;
      setTournaments((prev) => prev.map((t) => t.id === id ? { ...t, status: updated.status } : t));
      if (selectedTournamentDetail && selectedTournamentDetail.id === id) {
        setSelectedTournamentDetail({ ...selectedTournamentDetail, status: updated.status });
      }
      showToast(`Giải đấu #${id} đã chốt danh sách & sẵn sàng bắt đầu!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi sẵn sàng giải đấu';
      showToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Bắt đầu giải đấu + sinh nhánh đấu: READY -> ONGOING
  const handleStartTournament = async (id: number) => {
    setActionLoadingId({ id, action: 'start' });
    try {
      const response = await tournamentAPI.startTournament(id);
      const updated = response.data;
      setTournaments((prev) => prev.map((t) => t.id === id ? { 
        ...t, 
        status: updated.status, 
        currentRound: updated.currentRound 
      } : t));
      showToast(`Giải đấu #${id} đã chính thức bắt đầu và sinh nhánh đấu!`);
      // Tải lại chi tiết và mở tab bracket
      handleOpenDetail(id, 'BRACKET');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi bắt đầu giải đấu';
      showToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. Hủy giải đấu
  const handleCancelTournament = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy giải đấu này không?')) return;
    setActionLoadingId({ id, action: 'cancel' });
    try {
      const response = await tournamentAPI.cancelTournament(id);
      const updated = response.data;
      setTournaments((prev) => prev.map((t) => t.id === id ? { ...t, status: updated.status } : t));
      if (selectedTournamentDetail && selectedTournamentDetail.id === id) {
        setSelectedTournamentDetail({ ...selectedTournamentDetail, status: updated.status });
      }
      showToast(`Đã hủy giải đấu #${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi hủy giải đấu';
      showToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const setQuickStart = (minutesFromNow: number) => {
    const start = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const end = new Date(start.getTime() + 120 * 60 * 1000);
    setStartTime(toDatetimeLocalString(start));
    setEndTime(toDatetimeLocalString(end));
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!tournamentName.trim()) {
      setErrorMessage('Vui lòng nhập tên giải đấu');
      return;
    }

    if (!startTime || !endTime) {
      setErrorMessage('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setErrorMessage('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateTournamentRoomRequestDTO = {
        name: tournamentName.trim(),
        startTime: startTime.length === 16 ? `${startTime}:00` : startTime,
        endTime: endTime.length === 16 ? `${endTime}:00` : endTime,
        timeControl: timeControl,
        maxParticipants: maxParticipants,
        minParticipants: Math.min(4, maxParticipants),
        format: format,
      };

      const response = await tournamentAPI.createTournament(payload);
      const result = response.data;
      
      setCreatedSuccess(result);
      setTournaments((prev) => [result, ...prev]);
      setTournamentName('');
    } catch (err: any) {
      console.error('Lỗi khi tạo tournament:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể tạo giải đấu.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyTournamentCode = (id: number) => {
    navigator.clipboard.writeText(String(id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const filteredTournaments = tournaments.filter((t) => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchQuery = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

  // Group bracket matches by roundNumber
  const bracketRounds = detailBracket.reduce((acc, match) => {
    const r = match.roundNumber || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {} as Record<number, TournamentMatchDTO[]>);

  return (
    <div className="page" style={{ padding: '2rem 1.5rem', maxWidth: 1280, margin: '0 auto' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '2rem' }}>🏆</span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Giải Đấu Cờ Vua</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Khám phá, tạo phòng và tranh tài các giải đấu cờ vua đỉnh cao
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={fetchTournaments} title="Tải lại">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => { setIsCreateModalOpen(true); setCreatedSuccess(null); }}>
            <Plus size={20} /> Tạo giải đấu mới
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {STATUS_LIST.map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className="btn btn-sm"
              style={{
                background: filterStatus === s.key ? 'var(--accent-glow)' : 'transparent',
                borderColor: filterStatus === s.key ? 'var(--accent-primary)' : 'var(--border)',
                color: filterStatus === s.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: filterStatus === s.key ? 700 : 500,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm kiếm giải đấu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {/* TOURNAMENT CARDS GRID */}
      {loading && tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách giải đấu...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>♟️</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Chưa có giải đấu nào phù hợp</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            {searchQuery || filterStatus !== 'ALL'
              ? 'Không tìm thấy giải đấu theo bộ lọc hiện tại. Thử chọn danh mục khác.'
              : 'Hãy là người đầu tiên tạo phòng giải đấu để mời các kỳ thủ tham gia tranh tài!'}
          </p>
          <button className="btn btn-primary" onClick={() => { setIsCreateModalOpen(true); setCreatedSuccess(null); }}>
            <Plus size={16} /> Tạo giải đấu ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredTournaments.map((t) => {
            const isOwner = currentUser && t.createdByUsername === currentUser.username;
            const currentParticipants = t.currentParticipantsCount ?? 0;
            const minP = t.minParticipants ?? 4;
            const isReadyEligible = (t.status === 'REGISTRATION' || t.status === 'FULL') && currentParticipants >= minP;

            return (
              <div key={t.id} className="glass-card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Header card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.8rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      ID: #{t.id} {t.createdByUsername && <span style={{ color: 'var(--accent-secondary)' }}>• Host: {t.createdByUsername}</span>}
                    </div>
                    {getStatusBadge(t.status)}
                  </div>

                  {/* Tournament title */}
                  <h3 
                    style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.3, cursor: 'pointer' }}
                    onClick={() => handleOpenDetail(t.id, 'INFO')}
                  >
                    {t.name}
                  </h3>

                  {/* Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={15} color="var(--accent-primary)" />
                      <span>Kỳ thủ: <strong>{currentParticipants}/{t.maxParticipants ?? 8}</strong> (Tối thiểu: {minP})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={15} color="var(--accent-primary)" />
                      <span>Thời gian mỗi bên: <strong>{formatTimeControl(t.timeControl)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={15} color="var(--accent-primary)" />
                      <span>Bắt đầu: <strong>{formatDateTime(t.startTime)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Actions per State */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* DRAFT: Open registration */}
                    {t.status === 'DRAFT' && (
                      <button
                        className="btn btn-sm"
                        style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', fontWeight: 600 }}
                        onClick={() => handleOpenRegistration(t.id)}
                        disabled={actionLoadingId?.id === t.id}
                      >
                        {actionLoadingId?.id === t.id && actionLoadingId.action === 'open' ? (
                          <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Đang mở...</>
                        ) : (
                          <><Globe size={14} /> Mở đăng ký</>
                        )}
                      </button>
                    )}

                    {/* REGISTRATION: Join */}
                    {t.status === 'REGISTRATION' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleJoinTournament(t.id)}
                        disabled={actionLoadingId?.id === t.id}
                      >
                        {actionLoadingId?.id === t.id && actionLoadingId.action === 'join' ? (
                          <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Đang tham gia...</>
                        ) : (
                          <><Swords size={14} /> Tham gia</>
                        )}
                      </button>
                    )}

                    {/* REGISTRATION/FULL: Ready button (if enough players) */}
                    {isReadyEligible && (
                      <button
                        className="btn btn-sm"
                        style={{ flex: 1, background: 'rgba(91, 138, 240, 0.2)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', fontWeight: 600 }}
                        onClick={() => handleReadyToStart(t.id)}
                        disabled={actionLoadingId?.id === t.id}
                        title="Chốt danh sách và đưa giải vào trạng thái Sẵn sàng"
                      >
                        {actionLoadingId?.id === t.id && actionLoadingId.action === 'ready' ? (
                          <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Đang chốt...</>
                        ) : (
                          <><CheckCircle2 size={14} /> Sẵn sàng</>
                        )}
                      </button>
                    )}

                    {/* READY: Start tournament */}
                    {t.status === 'READY' && (
                      <button
                        className="btn btn-sm"
                        style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', border: 'none', fontWeight: 700 }}
                        onClick={() => handleStartTournament(t.id)}
                        disabled={actionLoadingId?.id === t.id}
                      >
                        {actionLoadingId?.id === t.id && actionLoadingId.action === 'start' ? (
                          <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Đang bắt đầu...</>
                        ) : (
                          <><Play size={14} /> Bắt đầu giải</>
                        )}
                      </button>
                    )}

                    {/* ONGOING: Bracket view */}
                    {t.status === 'ONGOING' && (
                      <button
                        className="btn btn-sm"
                        style={{ flex: 1, background: '#ff7043', color: '#fff', border: 'none', fontWeight: 600 }}
                        onClick={() => handleOpenDetail(t.id, 'BRACKET')}
                      >
                        <Eye size={14} /> Nhánh đấu (Bracket)
                      </button>
                    )}

                    {/* FINISHED or others */}
                    {(t.status === 'FINISHED' || t.status === 'CANCELLED') && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleOpenDetail(t.id, 'INFO')}
                      >
                        <Trophy size={14} /> Xem kết quả
                      </button>
                    )}

                    {/* Chi tiết button */}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleOpenDetail(t.id, 'INFO')}
                      title="Xem chi tiết giải đấu"
                    >
                      <Eye size={14} />
                    </button>

                    {/* Copy code button */}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyTournamentCode(t.id)}
                      title="Sao chép ID giải đấu"
                    >
                      {copiedId ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    </button>
                  </div>

                  {/* Leave / Cancel secondary options */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    {(t.status === 'REGISTRATION' || t.status === 'FULL') && (
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                        onClick={() => handleLeaveTournament(t.id)}
                        disabled={actionLoadingId?.id === t.id}
                      >
                        Rút lui
                      </button>
                    )}

                    {isOwner && t.status !== 'CANCELLED' && t.status !== 'FINISHED' && (
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginLeft: 'auto' }}
                        onClick={() => handleCancelTournament(t.id)}
                        disabled={actionLoadingId?.id === t.id}
                      >
                        Hủy giải đấu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL CHI TIẾT & NHÁNH ĐẤU BRACKET VIEW   */}
      {/* ========================================== */}
      {selectedTournamentDetail && (
        <div className="modal-overlay" onClick={() => setSelectedTournamentDetail(null)}>
          <div
            className="glass-card modal animate-scale-up"
            style={{ maxWidth: 880, width: '95%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Trophy size={22} color="var(--accent-primary)" />
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{selectedTournamentDetail.name}</h2>
                  {getStatusBadge(selectedTournamentDetail.status)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  ID: #{selectedTournamentDetail.id} • Thể thức: {selectedTournamentDetail.format}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setSelectedTournamentDetail(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <button
                className={`btn btn-sm ${activeDetailTab === 'INFO' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveDetailTab('INFO')}
              >
                Thông tin chung
              </button>
              <button
                className={`btn btn-sm ${activeDetailTab === 'PARTICIPANTS' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveDetailTab('PARTICIPANTS')}
              >
                Danh sách kỳ thủ ({selectedTournamentDetail.participants?.length || 0})
              </button>
              <button
                className={`btn btn-sm ${activeDetailTab === 'BRACKET' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveDetailTab('BRACKET')}
              >
                Nhánh đấu (Bracket)
              </button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: THÔNG TIN CHUNG */}
                {activeDetailTab === 'INFO' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thời gian mỗi bên</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatTimeControl(selectedTournamentDetail.timeControl)}</div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kỳ thủ tham gia</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          {selectedTournamentDetail.currentParticipantsCount}/{selectedTournamentDetail.maxParticipants}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bắt đầu</div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatDateTime(selectedTournamentDetail.startTime)}</div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Người tổ chức (Host)</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-primary)' }}>
                          {selectedTournamentDetail.createdByUsername || 'Hệ thống'}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar in Modal */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      {selectedTournamentDetail.status === 'DRAFT' && (
                        <button className="btn btn-primary" onClick={() => handleOpenRegistration(selectedTournamentDetail.id)}>
                          <Globe size={16} /> Mở đăng ký công khai
                        </button>
                      )}
                      {selectedTournamentDetail.status === 'REGISTRATION' && (
                        <button className="btn btn-primary" onClick={() => handleJoinTournament(selectedTournamentDetail.id)}>
                          <Swords size={16} /> Tham gia giải đấu
                        </button>
                      )}
                      {(selectedTournamentDetail.status === 'REGISTRATION' || selectedTournamentDetail.status === 'FULL') && (
                        <button className="btn btn-secondary" onClick={() => handleReadyToStart(selectedTournamentDetail.id)}>
                          <CheckCircle2 size={16} /> Chốt danh sách (Ready)
                        </button>
                      )}
                      {selectedTournamentDetail.status === 'READY' && (
                        <button className="btn btn-primary" onClick={() => handleStartTournament(selectedTournamentDetail.id)}>
                          <Play size={16} /> Bắt đầu giải đấu & Sinh Bracket
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: DANH SÁCH KỲ THỦ */}
                {activeDetailTab === 'PARTICIPANTS' && (
                  <div>
                    {(!selectedTournamentDetail.participants || selectedTournamentDetail.participants.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        Chưa có kỳ thủ nào đăng ký tham gia giải đấu này.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                        {selectedTournamentDetail.participants.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            style={{
                              background: 'var(--bg-tertiary)',
                              padding: '0.85rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid var(--border)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'var(--accent-glow)', color: 'var(--accent-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.85rem'
                              }}>
                                {idx + 1}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.username}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Hạt giống #{p.seed ?? (idx + 1)}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontWeight: 800, color: 'var(--accent-secondary)' }}>
                              {p.score ?? 0} pts
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: NHÁNH ĐẤU BRACKET */}
                {activeDetailTab === 'BRACKET' && (
                  <div>
                    {detailBracket.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌿</div>
                        <p style={{ marginBottom: '1rem' }}>Nhánh đấu chưa được khởi tạo. Giải đấu cần ở trạng thái <strong>Sẵn sàng (READY)</strong> hoặc <strong>Đang diễn ra (ONGOING)</strong>.</p>
                        {selectedTournamentDetail.status === 'READY' && (
                          <button className="btn btn-primary" onClick={() => handleStartTournament(selectedTournamentDetail.id)}>
                            <Play size={16} /> Bắt đầu & Sinh nhánh đấu ngay
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                        {Object.keys(bracketRounds).map((roundStr) => {
                          const roundNum = Number(roundStr);
                          const matches = bracketRounds[roundNum];
                          const roundTitle = roundNum === 1 ? 'Vòng 1' : roundNum === 2 ? 'Bán kết' : roundNum === 3 ? 'Chung kết' : `Vòng ${roundNum}`;

                          return (
                            <div key={roundNum} style={{ minWidth: 240, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div style={{ fontWeight: 700, textAlign: 'center', color: 'var(--accent-primary)', borderBottom: '2px solid var(--accent-primary)', paddingBottom: '0.4rem' }}>
                                {roundTitle}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'space-around', height: '100%' }}>
                                {matches.map((m) => (
                                  <div
                                    key={m.id}
                                    style={{
                                      background: 'var(--bg-tertiary)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.75rem',
                                      position: 'relative'
                                    }}
                                  >
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between' }}>
                                      <span>Trận #{m.matchOrder}</span>
                                      <span>{m.status}</span>
                                    </div>

                                    {/* White player */}
                                    <div style={{
                                      padding: '0.4rem 0.5rem',
                                      background: m.winnerId && m.winnerId === m.whitePlayerId ? 'rgba(76, 175, 130, 0.2)' : 'transparent',
                                      borderRadius: 4,
                                      fontWeight: m.winnerId && m.winnerId === m.whitePlayerId ? 700 : 500,
                                      display: 'flex',
                                      justifyContent: 'space-between'
                                    }}>
                                      <span>⚪ {m.whitePlayerUsername || 'TBD'}</span>
                                      {m.winnerId && m.winnerId === m.whitePlayerId && <span>👑</span>}
                                    </div>

                                    <div style={{ height: 1, background: 'var(--border)', margin: '0.2rem 0' }} />

                                    {/* Black player */}
                                    <div style={{
                                      padding: '0.4rem 0.5rem',
                                      background: m.winnerId && m.winnerId === m.blackPlayerId ? 'rgba(76, 175, 130, 0.2)' : 'transparent',
                                      borderRadius: 4,
                                      fontWeight: m.winnerId && m.winnerId === m.blackPlayerId ? 700 : 500,
                                      display: 'flex',
                                      justifyContent: 'space-between'
                                    }}>
                                      <span>⚫ {m.blackPlayerUsername || (m.status === 'BYE' ? '--- (Miễn đấu)' : 'TBD')}</span>
                                      {m.winnerId && m.winnerId === m.blackPlayerId && <span>👑</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL TẠO GIẢI ĐẤU MỚI (/api/tournament)  */}
      {/* ========================================== */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsCreateModalOpen(false)}>
          <div
            className="glass-card modal animate-scale-up"
            style={{ maxWidth: 580, width: '92%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={22} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Tạo Giải Đấu Mới</h2>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            {createdSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>
                  Tạo Giải Đấu Thành Công!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Giải đấu đã được khởi tạo với trạng thái ban đầu là <strong>Bản nháp (DRAFT)</strong>.
                </p>

                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mã giải đấu (ID):</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>
                      #{createdSuccess.id}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tên giải:</span>
                    <span style={{ fontWeight: 600 }}>{createdSuccess.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
                    <span>{getStatusBadge(createdSuccess.status)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {createdSuccess.status === 'DRAFT' && (
                    <button
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        padding: '0.6rem 1.1rem',
                      }}
                      onClick={() => handleOpenRegistration(createdSuccess.id)}
                      disabled={actionLoadingId?.id === createdSuccess.id}
                    >
                      <Globe size={16} /> Mở đăng ký ngay
                    </button>
                  )}
                  <button
                    className="btn btn-ghost"
                    onClick={() => copyTournamentCode(createdSuccess.id)}
                  >
                    {copiedId ? <Check size={16} color="var(--success)" /> : <Copy size={16} />} Sao chép ID
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setIsCreateModalOpen(false); setCreatedSuccess(null); }}
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {errorMessage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-glow)', border: '1px solid var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Tên giải đấu <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Grand Blitz Cup 2026, Vô địch Mùa Hè..."
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    required
                    maxLength={50}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Sparkles size={11} /> Gợi ý:
                    </span>
                    {['Grand Blitz Championship', 'Summer Chess Open', 'Weekly Blitz Arena'].map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setTournamentName(name)}
                        style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--accent-secondary)', fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: 4, cursor: 'pointer' }}
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Thể thức thời gian (Time Control)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {TIME_PRESETS.map((t) => (
                      <button
                        key={t.seconds}
                        type="button"
                        className={`time-btn ${timeControl === t.seconds ? 'selected' : ''}`}
                        onClick={() => setTimeControl(t.seconds)}
                        style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}
                      >
                        <div style={{ fontWeight: 700 }}>{t.label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Số kỳ thủ tối đa</label>
                    <select
                      className="form-input"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    >
                      <option value={4}>4 Kỳ thủ (Bán kết + Chung kết)</option>
                      <option value={8}>8 Kỳ thủ (Tứ kết + Bán kết + Chung kết)</option>
                      <option value={16}>16 Kỳ thủ (Vòng 1/8)</option>
                      <option value={32}>32 Kỳ thủ (Vòng 1/16)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Thể thức thi đấu</label>
                    <select
                      className="form-input"
                      value={format}
                      onChange={(e) => setFormat(e.target.value as any)}
                    >
                      <option value="SINGLE_ELIMINATION">Loại trực tiếp (Single Elimination)</option>
                      <option value="ROUND_ROBIN">Vòng tròn tính điểm (Round Robin)</option>
                      <option value="SWISS">Hệ Thụy Sĩ (Swiss System)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Bắt đầu lúc <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Kết thúc lúc <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chọn nhanh:</span>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setQuickStart(15)}>
                    Sau 15 phút
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setQuickStart(60)}>
                    Sau 1 giờ
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setQuickStart(24 * 60)}>
                    Ngày mai
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={submitting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang tạo...</>
                    ) : (
                      <><Trophy size={16} /> Tạo giải đấu</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className="animate-scale-up"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: toastMessage.type === 'success' ? '#064e3b' : '#7f1d1d',
            border: `1px solid ${toastMessage.type === 'success' ? '#059669' : '#dc2626'}`,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            fontSize: '0.9rem',
          }}
        >
          {toastMessage.type === 'success' ? <Check size={18} color="#34d399" /> : <AlertCircle size={18} color="#f87171" />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
