package com.chess.services;

import com.chess.dto.request.DashboardSummaryDTO;
import com.chess.dto.request.DashboardSummaryDTO.*;
import com.chess.enums.TournamentStatus;
import com.chess.models.Game;
import com.chess.models.Tournament;
import com.chess.models.User;
import com.chess.repositories.GameRepository;
import com.chess.repositories.TournamentRepository;
import com.chess.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDashboardService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private GameRepository gameRepository;
    @Autowired
    private TournamentRepository tournamentRepository;

    public DashboardSummaryDTO userDashboardSummary(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("UserId not valid"));
        int streak = 0;

        // Tính hạng rank
        Long rankPosition = userRepository.countByEloRatingGreaterThan(user.getEloRating());

        // tính streak thắng gần đây
        List<Game> recentGameList = gameRepository.findByUserIdOrderByPlayedAtDesc(user.getId());
        for(Game game: recentGameList) {
            if(game.getResult().equals("WIN")) {
                streak++;
            }
            else{
                break;
            }
        }

        // UserRankInfo
        String userName = user.getUsername();
        String email = user.getEmail();
        String avatarUrl = user.getAvatarUrl();
        Integer eloRating = user.getEloRating();
        UserRankInfo userRankInfo = new UserRankInfo(userName, email, avatarUrl, eloRating, rankPosition);

        // OverallStats
        Long totalGames = gameRepository.countByUser(user);
        Integer wins = user.getWins();
        Integer loses = user.getLosses();
        Integer draw = user.getDraws();
        Double winRate = (wins / (double)totalGames) * 100.0;
        OverallStats overallStats = new OverallStats(totalGames,wins, loses, draw, winRate, streak);

        // RecentGameDTO
        List<Game> last5Games = gameRepository.findTop5ByOrderByPlayedAtDesc();
        RecentGameDTO recentGameDTO = new RecentGameDTO(last5Games);

        // TopPlayerDTO
        List<User> top5EloRatingPlayer = userRepository.findTop5ByOrderByEloRatingDesc();
        TopPlayerDTO topPlayerDTO = new TopPlayerDTO(top5EloRatingPlayer);

        // UpcomingTournamentDTO
        List<Tournament> registrationStatusTournament = tournamentRepository.findByStatus(TournamentStatus.REGISTRATION);


        return new DashboardSummaryDTO(userRankInfo,overallStats,recentGameDTO,topPlayerDTO);
    }

}
