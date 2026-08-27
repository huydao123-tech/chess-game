package com.chess.dto.response;

import com.chess.enums.TournamentFormat;
import com.chess.enums.TournamentStatus;
import com.chess.models.Tournament;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Full tournament detail DTO – includes participant list.
 * Used by GET /api/tournament/{id}
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentDetailResponseDTO {
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

    // Full participant list
    private List<ParticipantResponseDTO> participants;

    public static TournamentDetailResponseDTO fromEntity(Tournament tournament) {
        if (tournament == null) return null;

        List<ParticipantResponseDTO> participantList = tournament.getParticipants() != null
                ? tournament.getParticipants().stream()
                        .map(ParticipantResponseDTO::fromEntity)
                        .collect(Collectors.toList())
                : List.of();

        return TournamentDetailResponseDTO.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .status(tournament.getStatus())
                .timeControl(tournament.getTimeControl())
                .maxParticipants(tournament.getMaxParticipants())
                .minParticipants(tournament.getMinParticipants())
                .currentParticipantsCount(participantList.size())
                .format(tournament.getFormat())
                .currentRound(tournament.getCurrentRound())
                .createdByUsername(tournament.getCreatedBy() != null ? tournament.getCreatedBy().getUsername() : null)
                .startTime(tournament.getStartTime())
                .endTime(tournament.getEndTime())
                .createdAt(tournament.getCreatedAt())
                .participants(participantList)
                .build();
    }
}
