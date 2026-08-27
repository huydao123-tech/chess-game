package com.chess.dto.response;

import com.chess.enums.MatchStatus;
import com.chess.models.TournamentMatch;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentMatchResponseDTO {
    private Long id;
    private Integer roundNumber;
    private Integer matchOrder;
    private MatchStatus status;

    // White player
    private Long whitePlayerId;
    private String whitePlayerUsername;

    // Black player
    private Long blackPlayerId;
    private String blackPlayerUsername;

    // Winner
    private Long winnerId;
    private String winnerUsername;

    // Liên kết với ván cờ thực tế
    private Long gameId;

    // ID trận tiếp theo trong cây đấu
    private Long nextMatchId;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    public static TournamentMatchResponseDTO fromEntity(TournamentMatch m) {
        return TournamentMatchResponseDTO.builder()
                .id(m.getId())
                .roundNumber(m.getRoundNumber())
                .matchOrder(m.getMatchOrder())
                .status(m.getStatus())
                .whitePlayerId(m.getWhitePlayer() != null ? m.getWhitePlayer().getId() : null)
                .whitePlayerUsername(m.getWhitePlayer() != null ? m.getWhitePlayer().getUsername() : null)
                .blackPlayerId(m.getBlackPlayer() != null ? m.getBlackPlayer().getId() : null)
                .blackPlayerUsername(m.getBlackPlayer() != null ? m.getBlackPlayer().getUsername() : null)
                .winnerId(m.getWinner() != null ? m.getWinner().getId() : null)
                .winnerUsername(m.getWinner() != null ? m.getWinner().getUsername() : null)
                .gameId(m.getGame() != null ? m.getGame().getId() : null)
                .nextMatchId(m.getNextMatchId())
                .startTime(m.getStartTime())
                .endTime(m.getEndTime())
                .build();
    }
}
