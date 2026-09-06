package com.chess.dto.request;

import com.chess.models.Game;
import com.chess.models.Tournament;
import com.chess.models.User;
import com.fasterxml.jackson.databind.deser.DataFormatReaders;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {
    private UserRankInfo userRankInfo;
    private OverallStats overallStats;
    private RecentGameDTO RecentGameDTO;
    private TopPlayerDTO TopPlayerDTO;


    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserRankInfo{
        private String userName;
        private String email;
        private String avatarUrl;
        private Integer eloRating;
        private Long rankPosition;
    }
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverallStats {
        private Long totalGames;
        private Integer wins;
        private Integer losses;
        private Integer draws;
        private Double winRate;
        private Integer winStreak;

    }
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentGameDTO {
        // repo
        private List<Game> last5Games;
    }


    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopPlayerDTO {
        // repo
        private List<User> top5EloRatingPlayer;
    }

}
