package com.chess.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameDTO {
    private Long id;
    private String playerColor;
    private Integer aiLevel;
    private String result;
    private Integer totalMoves;
    private Integer durationSeconds;
    private Integer timeControl;
    private Integer eloBefore;
    private Integer eloAfter;
    private Integer eloChange;
    private LocalDateTime playedAt;
    private String pgn; // Only included in detail view
    private String finalFen;
}
