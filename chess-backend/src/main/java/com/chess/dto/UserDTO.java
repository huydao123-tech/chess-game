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
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private Integer eloRating;
    private Integer totalGames;
    private Integer wins;
    private Integer losses;
    private Integer draws;
    private String avatarUrl;
    private LocalDateTime createdAt;
}
