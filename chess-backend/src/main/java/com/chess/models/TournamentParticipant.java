package com.chess.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "tournament_participants",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"tournament_id", "user_id"})
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"passwordHash", "refreshToken", "games", "tournamentParticipants"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    @JsonIgnoreProperties({"participants", "matches", "createdBy"})
    private Tournament tournament;

    @Builder.Default
    @Column(name = "score")
    private Double score = 0.0; // Điểm số tích lũy trong giải (Thắng = 1, Hòa = 0.5, Thua = 0)

    @Column(name = "rank")
    private Integer rank; // Thứ hạng chung cuộc (1 = Quán quân, 2 = Á quân...)

    @Column(name = "seed")
    private Integer seed; // Vị trí hạt giống khi bốc thăm

    @Column(name = "price")
    private Double price; // Phí tham gia hoặc giải thưởng nhận được

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;
}
