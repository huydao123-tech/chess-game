import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 & auto-refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken, user } = response.data;
          useAuthStore.getState().setAuth(accessToken, newRefreshToken, user);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { username?: string; avatarUrl?: string }) =>
    api.put('/users/me', data),
  getStats: () => api.get('/users/me/stats'),
};

// Game APIs
export const gameAPI = {
  saveGame: (data: {
    playerColor: string;
    aiLevel: number;
    result: string;
    pgn?: string;
    finalFen?: string;
    totalMoves?: number;
    durationSeconds?: number;
    timeControl?: number;
  }) => api.post('/games', data),
  getGames: (page = 0, size = 10) =>
    api.get(`/games?page=${page}&size=${size}`),
  getGame: (id: number) => api.get(`/games/${id}`),
};

// ==========================================
// FRIENDSHIP TYPES
// ==========================================

export type FriendshipStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'BLOCKED_BY_USER1'
  | 'BLOCKED_BY_USER2';

export interface FriendDTO {
  friendshipId: number;
  friendId: number;
  username: string;
  avatarUrl?: string;
  eloRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  status: FriendshipStatus;
  since: string;
  isOnline?: boolean;
}

export interface FriendRequestDTO {
  friendshipId: number;
  requesterId: number;
  requesterUsername: string;
  requesterAvatarUrl?: string;
  requesterElo: number;
  receiverId: number;
  receiverUsername: string;
  receiverAvatarUrl?: string;
  receiverElo: number;
  status: FriendshipStatus;
  createdAt: string;
}

export interface FriendshipStatusResponseDTO {
  targetUserId: number;
  status: string; // 'NONE' | 'FRIEND' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'BLOCKED_BY_YOU' | 'BLOCKED_BY_THEM'
  friendshipId?: number;
}

export interface SendFriendResponse {
  id: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  receiverUsername: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeEvent {
  type: 'CHALLENGE_RECEIVED' | 'CHALLENGE_ACCEPTED' | 'CHALLENGE_DECLINED' | 'CHALLENGE_CANCELLED' | 'CHALLENGE_FAILED_OFFLINE' | 'CHALLENGE_START';
  challengeId?: string;
  challengerId?: number;
  challengerUsername?: string;
  challengerAvatarUrl?: string;
  challengerElo?: number;
  targetUserId?: number;
  targetUsername?: string;
  timeControl?: number;
  roomId?: string;
  isHost?: boolean;
  opponentUsername?: string;
  message?: string;
}

// ==========================================
// FRIENDSHIP & PRESENCE APIs
// ==========================================

export const presenceAPI = {
  getOnlineUsers: () => api.get<number[]>('/presence/online'),
};

export const friendAPI = {
  sendFriendRequest: (targetUserId: number, note?: string) =>
    api.post<SendFriendResponse>(`/friend/send/${targetUserId}`, { note }),
  acceptFriendRequest: (friendshipId: number) =>
    api.post<SendFriendResponse>(`/friend/accept/${friendshipId}`),
  acceptFriendRequestByUser: (targetUserId: number) =>
    api.post<SendFriendResponse>(`/friend/accept/user/${targetUserId}`),
  rejectFriendRequest: (friendshipId: number) =>
    api.post<SendFriendResponse>(`/friend/reject/${friendshipId}`),
  rejectFriendRequestByUser: (targetUserId: number) =>
    api.post<SendFriendResponse>(`/friend/reject/user/${targetUserId}`),
  cancelFriendRequest: (friendshipId: number) =>
    api.post<SendFriendResponse>(`/friend/cancel/${friendshipId}`),
  cancelFriendRequestByUser: (targetUserId: number) =>
    api.post<SendFriendResponse>(`/friend/cancel/user/${targetUserId}`),
  unfriend: (targetUserId: number) =>
    api.delete(`/friend/unfriend/${targetUserId}`),
  blockUser: (targetUserId: number) =>
    api.post(`/friend/block/${targetUserId}`),
  unblockUser: (targetUserId: number) =>
    api.post(`/friend/unblock/${targetUserId}`),
  getFriendsList: () =>
    api.get<FriendDTO[]>('/friend/list'),
  getReceivedFriendRequests: () =>
    api.get<FriendRequestDTO[]>('/friend/requests/received'),
  getSentFriendRequests: () =>
    api.get<FriendRequestDTO[]>('/friend/requests/sent'),
  getBlockedUsers: () =>
    api.get<FriendDTO[]>('/friend/blocked'),
  getFriendshipStatus: (targetUserId: number) =>
    api.get<FriendshipStatusResponseDTO>(`/friend/status/${targetUserId}`),
};

// ==========================================
// TOURNAMENT TYPES
// ==========================================

export type TournamentStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'REGISTRATION'
  | 'FULL'
  | 'READY'
  | 'ONGOING'
  | 'PAUSED'
  | 'FINISHED'
  | 'CANCELLED';

export type TournamentFormat = 'SINGLE_ELIMINATION' | 'ROUND_ROBIN' | 'SWISS';
export type MatchStatus = 'SCHEDULED' | 'READY' | 'PLAYING' | 'FINISHED' | 'BYE' | 'CANCELLED';

export interface CreateTournamentRoomRequestDTO {
  id?: number;
  name: string;
  startTime: string;
  endTime: string;
  timeControl: number;
  maxParticipants?: number;
  minParticipants?: number;
  format?: TournamentFormat;
}

export interface CreateTournamentRoomResponseDTO {
  id: number;
  tournamentName: string;
  status: TournamentStatus;
  createdAt: string;
}

/** Dùng cho danh sách giải đấu (không có participants) */
export interface TournamentDTO {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  status: TournamentStatus;
  timeControl: number;
  maxParticipants?: number;
  minParticipants?: number;
  currentParticipantsCount?: number;
  format?: TournamentFormat;
  currentRound?: number;
  createdByUsername?: string;
  createdAt?: string;
}

/** Một kỳ thủ trong giải đấu */
export interface ParticipantDTO {
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  score: number;
  seed?: number;
  rank?: number;
  joinedAt: string;
}

/** Một trận đấu trong bracket */
export interface TournamentMatchDTO {
  id: number;
  roundNumber: number;
  matchOrder: number;
  status: MatchStatus;
  whitePlayerId?: number;
  whitePlayerUsername?: string;
  blackPlayerId?: number;
  blackPlayerUsername?: string;
  winnerId?: number;
  winnerUsername?: string;
  gameId?: number;
  nextMatchId?: number;
  startTime?: string;
  endTime?: string;
}

/** Chi tiết giải đấu kèm danh sách kỳ thủ */
export interface TournamentDetailDTO extends TournamentDTO {
  participants: ParticipantDTO[];
}

// ==========================================
// TOURNAMENT APIs
// ==========================================

export const tournamentAPI = {
  // State transitions
  createTournament: (data: CreateTournamentRoomRequestDTO) =>
    api.post<TournamentDTO>('/tournament', data),
  openRegistration: (id: number) =>
    api.post<TournamentDTO>(`/tournament/${id}/open`),
  joinTournament: (id: number) =>
    api.post<TournamentDTO>(`/tournament/${id}/join`),
  leaveTournament: (id: number) =>
    api.post<TournamentDTO>(`/tournament/${id}/leave`),
  readyToStart: (id: number) =>
    api.post<TournamentDTO>(`/tournament/${id}/ready`),
  startTournament: (id: number) =>
    api.post<TournamentDetailDTO>(`/tournament/${id}/start`),
  cancelTournament: (id: number) =>
    api.post<TournamentDTO>(`/tournament/${id}/cancel`),

  // Queries
  getTournaments: () =>
    api.get<TournamentDTO[]>('/tournament'),
  getTournament: (id: number) =>
    api.get<TournamentDTO>(`/tournament/${id}`),
  getTournamentDetail: (id: number) =>
    api.get<TournamentDetailDTO>(`/tournament/${id}/detail`),
  getParticipants: (id: number) =>
    api.get<ParticipantDTO[]>(`/tournament/${id}/participants`),
  getBracket: (id: number) =>
    api.get<TournamentMatchDTO[]>(`/tournament/${id}/bracket`),

  // Backward compat
  openTournament: (data: CreateTournamentRoomRequestDTO) =>
    api.post<CreateTournamentRoomResponseDTO>('/tournament/open', data),
  createTournamentRoom: (data: CreateTournamentRoomRequestDTO) =>
    api.post<CreateTournamentRoomResponseDTO>('/tournament/create', data),
};

// ==========================================
// DASHBOARD APIs
// ==========================================

export interface DashboardSummaryDTO {
  userRankInfo: {
    userName?: string;
    username?: string;
    email: string;
    avatarUrl?: string;
    eloRating: number;
    rankPosition: number;
  };
  overallStats: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    winStreak: number;
  };
  recentGameDTO: {
    last5Games: any[]; // Any for now, represents Game array
  };
  topPlayerDTO: {
    top5EloRatingPlayer: any[]; // Any for now, represents User array
  };
}

export const dashboardAPI = {
  getSummary: (userId: number) =>
    api.get<DashboardSummaryDTO>(`/dashboard/${userId}/summary`),
};
