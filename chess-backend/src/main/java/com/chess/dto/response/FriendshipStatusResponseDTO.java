package com.chess.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendshipStatusResponseDTO {
    private Long targetUserId;
    private String status; // "NONE", "FRIEND", "PENDING_SENT", "PENDING_RECEIVED", "BLOCKED_BY_YOU", "BLOCKED_BY_THEM"
    private Long friendshipId;
}
