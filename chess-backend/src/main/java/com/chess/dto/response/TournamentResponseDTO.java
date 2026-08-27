package com.chess.dto.response;

import com.chess.enums.TournamentFormat;
import com.chess.enums.TournamentStatus;
import com.chess.models.Tournament;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentResponseDTO {
    private Long id;
    private String name;
    private TournamentStatus status;
    private int timeControl;
    private int maxParticipants;
    private int minParticipants;
    private int currentParticipantsCount;
    private TournamentFormat format;
    private int currentRound;
    private String createdByUsername;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime createdAt;

    public static TournamentResponseDTO fromEntity(Tournament tournament) {
        if (tournament == null) return null;
        return TournamentResponseDTO.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .status(tournament.getStatus())
                .timeControl(tournament.getTimeControl())
                .maxParticipants(tournament.getMaxParticipants())
                .minParticipants(tournament.getMinParticipants())
                .currentParticipantsCount(tournament.getParticipants() != null ? tournament.getParticipants().size() : 0)
                .format(tournament.getFormat())
                .currentRound(tournament.getCurrentRound())
                .createdByUsername(tournament.getCreatedBy() != null ? tournament.getCreatedBy().getUsername() : null)
                .startTime(tournament.getStartTime())
                .endTime(tournament.getEndTime())
                .createdAt(tournament.getCreatedAt())
                .build();
    }
}
