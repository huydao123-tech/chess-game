package com.chess.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "games")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "player_color", nullable = false, length = 5)
    private String playerColor; // "WHITE" or "BLACK"

    @Column(name = "ai_level", nullable = false)
    private Integer aiLevel; // 1-20

    @Column(nullable = false, length = 10)
    private String result; // "WIN", "LOSS", "DRAW"

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String pgn;

    @Column(name = "final_fen", length = 100)
    private String finalFen;

    @Builder.Default
    @Column(name = "total_moves")
    private Integer totalMoves = 0;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "time_control")
    private Integer timeControl; // seconds per side

    @Column(name = "elo_before")
    private Integer eloBefore;

    @Column(name = "elo_after")
    private Integer eloAfter;

    @Column(name = "elo_change")
    private Integer eloChange;

    @CreationTimestamp
    @Column(name = "played_at", updatable = false)
    private LocalDateTime playedAt;
}
