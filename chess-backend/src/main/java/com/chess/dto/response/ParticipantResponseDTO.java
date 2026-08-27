package com.chess.dto.response;

import com.chess.models.TournamentParticipant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantResponseDTO {
    private Long id;
    private Long userId;
    private String username;
    private String avatarUrl;
    private Double score;
    private Integer seed;
    private Integer rank;
    private LocalDateTime joinedAt;

    public static ParticipantResponseDTO fromEntity(TournamentParticipant p) {
        return ParticipantResponseDTO.builder()
                .id(p.getId())
                .userId(p.getUser() != null ? p.getUser().getId() : null)
                .username(p.getUser() != null ? p.getUser().getUsername() : null)
                .avatarUrl(p.getUser() != null ? p.getUser().getAvatarUrl() : null)
                .score(p.getScore())
                .seed(p.getSeed())
                .rank(p.getRank())
                .joinedAt(p.getJoinedAt())
                .build();
    }
}
