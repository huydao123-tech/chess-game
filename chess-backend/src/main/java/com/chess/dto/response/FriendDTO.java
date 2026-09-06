package com.chess.dto.response;

import com.chess.enums.FriendshipStatus;
import com.chess.models.Friendship;
import com.chess.models.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendDTO {
    private Long friendshipId;
    private Long friendId;
    private String username;
    private String avatarUrl;
    private Integer eloRating;
    private Integer totalGames;
    private Integer wins;
    private Integer losses;
    private Integer draws;
    private FriendshipStatus status;
    private LocalDateTime since;
    private Boolean isOnline;

    public static FriendDTO fromFriendship(Friendship friendship, Long currentUserId) {
        return fromFriendship(friendship, currentUserId, false);
    }

    public static FriendDTO fromFriendship(Friendship friendship, Long currentUserId, boolean isOnline) {
        if (friendship == null) return null;
        User friend = friendship.getUser1().getId().equals(currentUserId) 
                ? friendship.getUser2() 
                : friendship.getUser1();
        return FriendDTO.builder()
                .friendshipId(friendship.getId())
                .friendId(friend.getId())
                .username(friend.getUsername())
                .avatarUrl(friend.getAvatarUrl())
                .eloRating(friend.getEloRating())
                .totalGames(friend.getTotalGames())
                .wins(friend.getWins())
                .losses(friend.getLosses())
                .draws(friend.getDraws())
                .status(friendship.getStatus())
                .since(friendship.getUpdatedAt() != null ? friendship.getUpdatedAt() : friendship.getCreatedAt())
                .isOnline(isOnline)
                .build();
    }
}
