package com.chess.models;

import com.chess.enums.TournamentFormat;
import com.chess.enums.TournamentStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournaments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 3, max = 100)
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @NotNull
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TournamentStatus status;

    @Column(name = "time_control", nullable = false)
    private int timeControl; // tính bằng giây (VD: 300 = 5 phút)

    @Builder.Default
    @Column(name = "max_participants", nullable = false)
    private int maxParticipants = 8; // Số người tối đa: 8, 16, 32...

    @Builder.Default
    @Column(name = "min_participants", nullable = false)
    private int minParticipants = 4; // Số người tối thiểu để bắt đầu giải

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 30)
    private TournamentFormat format = TournamentFormat.SINGLE_ELIMINATION;

    @Builder.Default
    @Column(name = "current_round", nullable = false)
    private int currentRound = 0; // 0: chưa bắt đầu, 1: Vòng 1, 2: Vòng 2...

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({"passwordHash", "refreshToken", "games", "tournamentParticipants"})
    private User createdBy; // Host / Admin tạo giải

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "tournament", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("tournament")
    @Builder.Default
    private List<TournamentParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "tournament", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("tournament")
    @Builder.Default
    private List<TournamentMatch> matches = new ArrayList<>();

    // === DOMAIN BUSINESS METHODS (STATE TRANSITIONS) ===

    /**
     * Chuyển State: DRAFT -> REGISTRATION (Mở đăng ký công khai)
     */
    public void openRegistration() {
        if (this.status != TournamentStatus.DRAFT && this.status != TournamentStatus.UPCOMING) {
            throw new IllegalStateException("Chỉ giải đấu ở trạng thái DRAFT hoặc UPCOMING mới có thể mở đăng ký.");
        }
        this.status = TournamentStatus.REGISTRATION;
    }

    /**
     * Kiểm tra và tự động chuyển State: REGISTRATION -> FULL (Nếu đã đủ số lượng người đăng ký)
     */
    public void checkAndTransitionFullState() {
        int currentCount = (this.participants != null) ? this.participants.size() : 0;
        if (this.status == TournamentStatus.REGISTRATION && currentCount >= this.maxParticipants) {
            this.status = TournamentStatus.FULL;
        } else if (this.status == TournamentStatus.FULL && currentCount < this.maxParticipants) {
            this.status = TournamentStatus.REGISTRATION;
        }
    }

    /**
     * Chuyển State: REGISTRATION/FULL -> READY (Chốt danh sách, sẵn sàng bắt đầu)
     */
    public void readyToStart() {
        int currentCount = (this.participants != null) ? this.participants.size() : 0;
        if (currentCount < this.minParticipants) {
            throw new IllegalStateException("Chưa đủ số lượng kỳ thủ tối thiểu (" + this.minParticipants + " người) để sẵn sàng.");
        }
        this.status = TournamentStatus.READY;
    }

    /**
     * Chuyển State: READY -> ONGOING (Bắt đầu thi đấu)
     */
    public void startTournament() {
        if (this.status != TournamentStatus.READY && this.status != TournamentStatus.FULL && this.status != TournamentStatus.REGISTRATION) {
            throw new IllegalStateException("Giải đấu chưa sẵn sàng để bắt đầu!");
        }
        int currentCount = (this.participants != null) ? this.participants.size() : 0;
        if (currentCount < this.minParticipants) {
            throw new IllegalStateException("Số lượng kỳ thủ tham gia (" + currentCount + ") chưa đạt mức tối thiểu (" + this.minParticipants + ").");
        }
        this.status = TournamentStatus.ONGOING;
        this.currentRound = 1;
    }

    /**
     * Khởi tạo phòng giải đấu ở trạng thái DRAFT
     */
    public void createRoom(Long tournamentId, String name, LocalDateTime startTime, LocalDateTime endTime, int timeControl) {
        if (tournamentId != null) {
            this.id = tournamentId;
        }
        this.name = name;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = TournamentStatus.DRAFT;
        this.timeControl = timeControl;
    }

    /**
     * Legacy helper method for backward compatibility
     */
    public void openToPublic(Long tournamentId, String name, TournamentStatus status, LocalDateTime startTime, LocalDateTime endTime, int timeControl) {
        openRegistration();
        if (tournamentId != null) {
            this.id = tournamentId;
        }
        this.name = name;
        this.startTime = startTime;
        this.endTime = endTime;
        this.timeControl = timeControl;
    }
}
