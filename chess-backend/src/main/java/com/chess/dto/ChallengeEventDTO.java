package com.chess.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChallengeEventDTO {
    private String type; // CHALLENGE_RECEIVED, CHALLENGE_ACCEPTED, CHALLENGE_DECLINED, CHALLENGE_CANCELLED, CHALLENGE_FAILED_OFFLINE, CHALLENGE_START
    private String challengeId;
    private Long challengerId;
    private String challengerUsername;
    private String challengerAvatarUrl;
    private Integer challengerElo;
    private Long targetUserId;
    private String targetUsername;
    private Integer timeControl;
    private String roomId;
    private Boolean isHost;
    private String opponentUsername;
    private String message;
}
