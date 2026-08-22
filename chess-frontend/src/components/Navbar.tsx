import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api';
import { Swords, LayoutDashboard, Clock, LogOut, LogIn, Trophy } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    clearAuth();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          ♟ <span>Chess Online</span>
        </Link>

        {isAuthenticated && (
          <div className="navbar-nav">
            <Link to="/play" className={`navbar-link ${isActive('/play')}`}>
              <Swords size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Play
            </Link>
            <Link to="/online" className={`navbar-link ${isActive('/online')}`}>
              <Swords size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Online Match
            </Link>
            <Link to="/tournaments" className={`navbar-link ${isActive('/tournaments')}`}>
              <Trophy size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Tournaments
            </Link>
            <Link to="/history" className={`navbar-link ${isActive('/history')}`}>
              <Clock size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              History
            </Link>
            <Link to="/profile" className={`navbar-link ${isActive('/profile')}`}>
              <LayoutDashboard size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Profile
            </Link>
          </div>
        )}

        <div className="navbar-user">
          {isAuthenticated && user ? (
            <>
              <span className="elo-badge">♟ {user.eloRating}</span>
              <Link to="/profile" className="user-avatar" title={user.username}>
                {user.username.charAt(0).toUpperCase()}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                <LogIn size={16} /> Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
