import { useState, useEffect } from 'react';
import { 
  Trophy, Plus, Clock, Calendar, Search, 
  Check, Copy, AlertCircle, Sparkles, Swords, RefreshCw, X
} from 'lucide-react';
import { 
  tournamentAPI, 
  type TournamentDTO, 
  type TournamentStatus, 
  type CreateTournamentRoomRequestDTO, 
  type CreateTournamentRoomResponseDTO 
} from '../api';

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
  { key: 'ONGOING', label: 'Đang diễn ra', color: '#ff7043' },
  { key: 'UPCOMING', label: 'Sắp diễn ra', color: 'var(--warning)' },
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

function formatDateTime(dateTimeStr: string): string {
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

// Chuyển đối tượng Date sang chuỗi format cho input datetime-local (YYYY-MM-DDTHH:mm)
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
  // === STATE ===
  const [tournaments, setTournaments] = useState<TournamentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TournamentStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState<CreateTournamentRoomResponseDTO | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Form State
  const [tournamentName, setTournamentName] = useState('');
  const [timeControl, setTimeControl] = useState(300); // 5 minutes default
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000); // Mặc định sau 30 phút
    return toDatetimeLocalString(d);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date(Date.now() + 150 * 60 * 1000); // Mặc định kết thúc sau 2.5 tiếng
    return toDatetimeLocalString(d);
  });

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

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Quick Preset cho thời gian bắt đầu
  const setQuickStart = (minutesFromNow: number) => {
    const start = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const end = new Date(start.getTime() + 120 * 60 * 1000); // +2 tiếng
    setStartTime(toDatetimeLocalString(start));
    setEndTime(toDatetimeLocalString(end));
  };

  // Mẫu tên gợi ý nhanh
  const applyNameSuggestion = (suggestion: string) => {
    setTournamentName(suggestion);
  };

  // Xử lý gửi Form tạo Tournament qua /api/tournament
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
      };

      // Gửi request POST tới /api/tournament
      const response = await tournamentAPI.createTournament(payload);
      const result = response.data;
      
      setCreatedSuccess(result);
      
      // Thêm vào danh sách giải đấu hiển thị
      setTournaments((prev) => [
        {
          id: result.id,
          name: result.tournamentName,
          status: result.status,
          startTime: payload.startTime,
          endTime: payload.endTime,
          timeControl: payload.timeControl,
        },
        ...prev,
      ]);

      // Reset form
      setTournamentName('');
    } catch (err: any) {
      console.error('Lỗi khi tạo tournament:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể tạo giải đấu. Vui lòng kiểm tra lại kết nối!';
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

  // Lọc giải đấu
  const filteredTournaments = tournaments.filter((t) => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchQuery = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchQuery;
  });

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
            Tạo và tham gia các giải đấu cờ vua trực tuyến, so tài cùng các kỳ thủ đỉnh cao
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={fetchTournaments} title="Tải lại">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => { setIsModalOpen(true); setCreatedSuccess(null); }}>
            <Plus size={20} /> Tạo giải đấu mới
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Status tabs */}
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

        {/* Search input */}
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
          <button className="btn btn-primary" onClick={() => { setIsModalOpen(true); setCreatedSuccess(null); }}>
            <Plus size={16} /> Tạo giải đấu ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredTournaments.map((t) => (
            <div key={t.id} className="glass-card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    ID: #{t.id}
                  </div>
                  {getStatusBadge(t.status)}
                </div>

                {/* Tournament title */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: 1.3 }}>
                  {t.name}
                </h3>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={15} color="var(--accent-primary)" />
                    <span>Thời gian mỗi bên: <strong>{formatTimeControl(t.timeControl)}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={15} color="var(--accent-primary)" />
                    <span>Bắt đầu: <strong>{formatDateTime(t.startTime)}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={15} color="var(--text-muted)" />
                    <span>Kết thúc: {formatDateTime(t.endTime)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => alert(`Tham gia giải đấu #${t.id}: ${t.name}`)}
                >
                  <Swords size={14} /> Tham gia
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => copyTournamentCode(t.id)}
                  title="Sao chép ID giải đấu"
                >
                  {copiedId ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL TẠO GIẢI ĐẤU MỚI (/api/tournament)  */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div
            className="glass-card modal animate-scale-up"
            style={{ maxWidth: 580, width: '92%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={22} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Tạo Giải Đấu Mới</h2>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                <X size={18} />
              </button>
            </div>

            {/* IF SUCCESS: Show Confirmation */}
            {createdSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>
                  Tạo Giải Đấu Thành Công!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Giải đấu đã được khởi tạo trên hệ thống với API <code>/api/tournament</code>.
                </p>

                {/* Details Box */}
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mã giải đấu (ID):</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>
                      #{createdSuccess.id}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tên giải:</span>
                    <span style={{ fontWeight: 600 }}>{createdSuccess.tournamentName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
                    <span>{getStatusBadge(createdSuccess.status)}</span>
                  </div>
                  {createdSuccess.createdAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Thời gian tạo:</span>
                      <span>{formatDateTime(createdSuccess.createdAt)}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => copyTournamentCode(createdSuccess.id)}
                  >
                    {copiedId ? <Check size={16} color="var(--success)" /> : <Copy size={16} />} Sao chép ID
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setIsModalOpen(false); setCreatedSuccess(null); }}
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>
            ) : (
              /* FORM TẠO GIẢI ĐẤU */
              <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {errorMessage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-glow)', border: '1px solid var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Tên giải đấu */}
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

                  {/* Gợi ý nhanh */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Sparkles size={11} /> Gợi ý:
                    </span>
                    {['Grand Blitz Championship', 'Summer Chess Open', 'Weekly Blitz Arena'].map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => applyNameSuggestion(name)}
                        style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--accent-secondary)', fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: 4, cursor: 'pointer' }}
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chọn thời gian mỗi bên (TimeControl) */}
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

                {/* Thời gian bắt đầu & kết thúc */}
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

                {/* Quick start presets */}
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

                {/* Submit Action */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsModalOpen(false)}
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
                      <>
                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Trophy size={16} /> Tạo giải đấu
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
