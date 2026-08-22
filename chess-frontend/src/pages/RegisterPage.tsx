import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Yếu', color: 'var(--danger)' };
  if (score === 2) return { score, label: 'Trung bình', color: 'var(--warning)' };
  if (score === 3) return { score, label: 'Khá', color: '#ffb74d' };
  if (score === 4) return { score, label: 'Mạnh', color: 'var(--success)' };
  return { score, label: 'Rất mạnh', color: 'var(--success)' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        username: form.username,
        email: form.email,
        password: form.password,
      });
      const { accessToken, refreshToken, user } = res.data;
      setAuth(accessToken, refreshToken, user);
      navigate('/play');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">♞</div>
          <h1 className="auth-title">Tạo tài khoản</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Bắt đầu hành trình cờ vua với ELO khởi đầu 1200
          </p>
        </div>

        <div className="glass-card auth-card">
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              background: 'var(--danger-glow)', color: 'var(--danger)',
              border: '1px solid rgba(239,83,80,0.3)', marginBottom: '1.25rem',
              fontSize: '0.875rem',
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập</label>
              <input
                id="reg-username"
                type="text"
                className="form-input"
                placeholder="3-50 ký tự"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="email@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Ít nhất 6 ký tự"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  style={{ paddingRight: '3rem' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute', right: '1rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 0, display: 'flex',
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {form.password && (
                <div>
                  <div className="password-strength">
                    <div
                      className="password-strength-bar"
                      style={{
                        width: `${(strength.score / 5) * 100}%`,
                        backgroundColor: strength.color,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: strength.color, marginTop: '0.25rem' }}>
                    Độ mạnh: {strength.label}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${form.confirmPassword && form.confirmPassword !== form.password ? 'error' : ''}`}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  style={{ paddingRight: '3rem' }}
                  autoComplete="new-password"
                />
                {form.confirmPassword && form.confirmPassword === form.password && (
                  <CheckCircle2
                    size={18}
                    style={{
                      position: 'absolute', right: '1rem', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--success)',
                    }}
                  />
                )}
              </div>
            </div>

            <button
              id="btn-register"
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Đang tạo tài khoản...
                </span>
              ) : '🎯 Tạo tài khoản'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
