import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Zap, Shield, BarChart2, Trophy, Clock, Cpu } from 'lucide-react';

const features = [
  { icon: <Cpu size={28} />, title: 'Stockfish AI', desc: 'Đối thủ AI sử dụng engine Stockfish mạnh nhất thế giới với 20 cấp độ từ Beginner đến Grandmaster.' },
  { icon: <Clock size={28} />, title: 'Đồng hồ bấm giờ', desc: 'Nhiều lựa chọn thời gian: 1/3/5/10/15/30 phút. Tăng tốc độ và cường độ cho mỗi ván cờ.' },
  { icon: <BarChart2 size={28} />, title: 'Hệ thống ELO', desc: 'Điểm ELO tự động cập nhật sau mỗi ván đấu theo công thức chuẩn FIDE. Theo dõi sự tiến bộ.' },
  { icon: <Trophy size={28} />, title: 'Lịch sử ván đấu', desc: 'Lưu trữ và xem lại toàn bộ lịch sử ván cờ với tính năng replay từng nước đi.' },
  { icon: <Shield size={28} />, title: 'Bảo mật JWT', desc: 'Xác thực người dùng an toàn với JWT token, BCrypt password hashing.' },
  { icon: <Zap size={28} />, title: 'Hiệu năng cao', desc: 'AI chạy ngay trên trình duyệt qua Web Worker – không lag, không cần chờ đợi server.' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <Zap size={12} />
          Powered by Stockfish Engine
        </div>

        <div className="hero-chess">♚</div>

        <h1 className="hero-title">
          Master the Game of<br />
          <span className="gradient-text">Chess Online</span>
        </h1>

        <p className="hero-subtitle">
          Thách thức AI đỉnh cao Stockfish, leo thang bảng xếp hạng ELO và trở thành Grandmaster.
        </p>

        <div className="hero-actions">
          {isAuthenticated ? (
            <>
              <Link to="/play" className="btn btn-primary btn-lg">
                ♟ Chơi ngay
              </Link>
              <Link to="/tournaments" className="btn btn-ghost btn-lg">
                🏆 Giải đấu
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">
                ♟ Bắt đầu miễn phí
              </Link>
              <Link to="/login" className="btn btn-ghost btn-lg">
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '0.75rem' }}>
            Tất cả trong một nền tảng
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
            Đầy đủ tính năng cần thiết để chinh phục cờ vua
          </p>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="glass-card feature-card animate-fade-in"
                   style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="feature-icon" style={{ color: 'var(--accent-primary)' }}>
                  {f.icon}
                </span>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: 600, margin: '0 auto', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>
            Sẵn sàng thách thức?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Đăng ký miễn phí và bắt đầu hành trình trở thành Grandmaster ngay hôm nay.
          </p>
          {!isAuthenticated && (
            <Link to="/register" className="btn btn-primary btn-lg">
              Tạo tài khoản miễn phí →
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
