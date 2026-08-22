package com.chess.dto.response;

import com.chess.enums.TournamentStatus;
import com.chess.models.Tournament;

import java.time.LocalDateTime;

public class CreateTournamentRoomResponseDTO {
    private Long id;
    private String tournamentName;
    private TournamentStatus status;
    private LocalDateTime createdAt;
    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTournamentName() {
        return tournamentName;
    }

    public void setTournamentName(String tournamentName) {
        this.tournamentName = tournamentName;
    }

    public TournamentStatus getStatus() {
        return status;
    }

    public void setStatus(TournamentStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public CreateTournamentRoomResponseDTO(Long id, String tournamentName, TournamentStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.tournamentName = tournamentName;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static CreateTournamentRoomResponseDTO toEntity(Tournament tournament) {
        return new CreateTournamentRoomResponseDTO(tournament.getId(), tournament.getName(), tournament.getStatus(), LocalDateTime.now());
    }
}