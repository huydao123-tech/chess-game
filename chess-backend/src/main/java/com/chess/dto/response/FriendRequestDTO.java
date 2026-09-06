package com.chess.dto.response;

import com.chess.enums.FriendshipStatus;
import com.chess.models.Friendship;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestDTO {
    private Long friendshipId;
    private Long requesterId;
    private String requesterUsername;
    private String requesterAvatarUrl;
    private Integer requesterElo;
    private Long receiverId;
    private String receiverUsername;
    private String receiverAvatarUrl;
    private Integer receiverElo;
    private FriendshipStatus status;
    private LocalDateTime createdAt;

    public static FriendRequestDTO fromEntity(Friendship friendship) {
        if (friendship == null) return null;
        return FriendRequestDTO.builder()
                .friendshipId(friendship.getId())
                .requesterId(friendship.getUser1().getId())
                .requesterUsername(friendship.getUser1().getUsername())
                .requesterAvatarUrl(friendship.getUser1().getAvatarUrl())
                .requesterElo(friendship.getUser1().getEloRating())
                .receiverId(friendship.getUser2().getId())
                .receiverUsername(friendship.getUser2().getUsername())
                .receiverAvatarUrl(friendship.getUser2().getAvatarUrl())
                .receiverElo(friendship.getUser2().getEloRating())
                .status(friendship.getStatus())
                .createdAt(friendship.getCreatedAt())
                .build();
    }
}
