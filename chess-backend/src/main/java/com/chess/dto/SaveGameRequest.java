package com.chess.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SaveGameRequest {
    @NotBlank(message = "Player color is required")
    private String playerColor; // "WHITE" or "BLACK"

    @NotNull(message = "AI level is required")
    @Min(value = 1, message = "AI level must be at least 1")
    @Max(value = 20, message = "AI level must be at most 20")
    private Integer aiLevel;

    @NotBlank(message = "Result is required")
    private String result; // "WIN", "LOSS", "DRAW"

    private String pgn;
    private String finalFen;
    private Integer totalMoves;
    private Integer durationSeconds;
    private Integer timeControl;
}
