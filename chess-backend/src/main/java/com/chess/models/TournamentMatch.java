package com.chess.models;

import com.chess.enums.MatchStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "tournament_matches")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    @JsonIgnoreProperties({"participants", "matches", "createdBy"})
    private Tournament tournament;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber; // 1: Vòng 1 (Tứ kết), 2: Bán kết, 3: Chung kết...

    @Column(name = "match_order", nullable = false)
    private Integer matchOrder; // Thứ tự trận trong vòng: 1, 2, 3, 4...

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "white_player_id")
    @JsonIgnoreProperties({"passwordHash", "refreshToken", "games", "tournamentParticipants"})
    private User whitePlayer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "black_player_id")
    @JsonIgnoreProperties({"passwordHash", "refreshToken", "games", "tournamentParticipants"})
    private User blackPlayer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    @JsonIgnoreProperties({"passwordHash", "refreshToken", "games", "tournamentParticipants"})
    private User winner;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private MatchStatus status = MatchStatus.SCHEDULED;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    @JsonIgnoreProperties({"tournament", "tournamentMatch", "user"})
    private Game game; // Ván cờ thực tế tương ứng với trận đấu này

    @Column(name = "next_match_id")
    private Long nextMatchId; // ID trận đấu ở vòng tiếp theo mà người thắng sẽ bước vào

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
