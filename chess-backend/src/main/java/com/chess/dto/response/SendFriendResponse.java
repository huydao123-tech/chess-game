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
public class SendFriendResponse {
    private Long id;
    private Long senderId;
    private String senderUsername;
    private Long receiverId;
    private String receiverUsername;
    private FriendshipStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SendFriendResponse fromEntity(Friendship friendship) {
        if(friendship == null) return null;
        return SendFriendResponse.builder()
                .id(friendship.getId())
                .senderId(friendship.getUser1().getId())
                .senderUsername(friendship.getUser1().getUsername())
                .receiverId(friendship.getUser2().getId())
                .receiverUsername(friendship.getUser2().getUsername())
                .status(friendship.getStatus())
                .createdAt(friendship.getCreatedAt())
                .updatedAt(friendship.getUpdatedAt())
                .build();
    }
}
