package com.chess.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsDTO {
    private Integer currentElo;
    private Integer totalGames;
    private Integer wins;
    private Integer losses;
    private Integer draws;
    private Double winRate;
    private Integer peakElo;
    private Double avgEloChange;
}
