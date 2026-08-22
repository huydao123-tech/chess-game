import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import ReplayPage from './pages/ReplayPage';
import './styles/global.css';
import PvPMatch from './pages/PvPMatch';
import ReviewMatchPage from './pages/ReviewMatchPage';
import TournamentPage from './pages/TournamentPage';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/play" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={
          <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
        } />

        <Route path="/register" element={
          <PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>
        } />

        <Route path="/play" element={
          <ProtectedRoute><GamePage /></ProtectedRoute>
        } />

        <Route path="/tournaments" element={
          <ProtectedRoute><TournamentPage /></ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute><HistoryPage /></ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        <Route path="/replay/:id" element={
          <ProtectedRoute><ReplayPage /></ProtectedRoute>
        } />
        <Route path="/online" element={
          <ProtectedRoute><PvPMatch /></ProtectedRoute>
        } />
        <Route path="/review" element={
          <ProtectedRoute><ReviewMatchPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
