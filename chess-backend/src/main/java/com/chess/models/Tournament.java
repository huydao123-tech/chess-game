package com.chess.models;

import com.chess.enums.TournamentStatus;
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

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
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
    @Size(min = 3, max = 50)
    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @NotNull
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @NotNull
    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TournamentStatus status;

    @Column(name = "time_control", nullable = false)
    private int timeControl;

    @OneToMany(mappedBy = "tournament", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("tournament")
    private List<TournamentParticipant> participants;

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

    public void openToPublic(Long tournamentId, String name,TournamentStatus status, LocalDateTime startTime, LocalDateTime endTime, int timeControl) {
        if(status != TournamentStatus.DRAFT) {
            throw new IllegalArgumentException("Tournament không có trạng thái hợp lệ");
        }
        if (tournamentId != null) {
            this.id = tournamentId;
        }
        this.name = name;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = TournamentStatus.DRAFT;
        this.timeControl = timeControl;
    }
}
