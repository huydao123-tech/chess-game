package com.chess.models;

import com.chess.enums.FriendshipStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "friendships")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_1", nullable = false)
    private User user1;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_2", nullable = false)
    private User user2;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private FriendshipStatus status = FriendshipStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // =========================================================================
    // FACTORY METHOD
    // =========================================================================

    public static Friendship createRequest(User sender, User receiver) {
        if (sender.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("Không thể tự gửi kết bạn cho chính mình!");
        }

        return Friendship.builder()
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.PENDING)
                .build();
    }

    // =========================================================================
    // DOMAIN BUSINESS METHODS (STATE TRANSITIONS & GUARD CLAUSES)
    // =========================================================================

    public void accept(Long currentUserId) {
        if (this.status != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Lời mời kết bạn không ở trạng thái chờ duyệt!");
        }
        if (!this.user2.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Chỉ người nhận mới có quyền chấp nhận lời mời kết bạn!");
        }
        this.status = FriendshipStatus.ACCEPTED;
    }

    public void reject(Long currentUserId) {
        if (this.status != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Lời mời không ở trạng thái chờ duyệt!");
        }
        if (!this.user2.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Chỉ người nhận mới có quyền từ chối lời mời này!");
        }
        this.status = FriendshipStatus.REJECTED;
    }

    public void cancel(Long currentUserId) {
        if (this.status != FriendshipStatus.PENDING) {
            throw new IllegalStateException("Không thể thu hồi lời mời vì trạng thái hiện tại là: " + this.status);
        }
        if (!this.user1.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Chỉ người gửi mới có quyền thu hồi lời mời kết bạn!");
        }
        this.status = FriendshipStatus.CANCELLED;
    }

    public void block(Long currentUserId) {
        validateMember(currentUserId);

        if (this.status == FriendshipStatus.BLOCKED_BY_USER1 || this.status == FriendshipStatus.BLOCKED_BY_USER2) {
            throw new IllegalStateException("Mối quan hệ này đã bị chặn từ trước!");
        }

        if (this.user1.getId().equals(currentUserId)) {
            this.status = FriendshipStatus.BLOCKED_BY_USER1;
        } else {
            this.status = FriendshipStatus.BLOCKED_BY_USER2;
        }
    }


    public void reopen(User newSender, User newReceiver) {
        if (this.status == FriendshipStatus.BLOCKED) {
            throw new IllegalStateException("Không thể gửi kết bạn do tài khoản đang bị chặn!");
        }
        if (this.status == FriendshipStatus.ACCEPTED) {
            throw new IllegalStateException("Hai người đã là bạn bè!");
        }
        if (this.status == FriendshipStatus.PENDING) {
            throw new IllegalStateException("Lời mời kết bạn đã tồn tại và đang chờ phản hồi!");
        }

        this.user1 = newSender;
        this.user2 = newReceiver;
        this.status = FriendshipStatus.PENDING;
    }

    public void unfriend(Long currentUserId) {
        validateMember(currentUserId);
        if (this.status != FriendshipStatus.ACCEPTED) {
            throw new IllegalStateException("Hai người chưa phải là bạn bè!");
        }
        this.status = FriendshipStatus.CANCELLED;
    }

    public void unblock(Long currentUserId) {
        validateMember(currentUserId);
        if (this.status == FriendshipStatus.BLOCKED_BY_USER1 && this.user1.getId().equals(currentUserId)) {
            this.status = FriendshipStatus.CANCELLED;
        } else if (this.status == FriendshipStatus.BLOCKED_BY_USER2 && this.user2.getId().equals(currentUserId)) {
            this.status = FriendshipStatus.CANCELLED;
        } else {
            throw new IllegalStateException("Bạn không có quyền bỏ chặn mối quan hệ này!");
        }
    }

    private void validateMember(Long currentUserId) {
        if (!this.user1.getId().equals(currentUserId) && !this.user2.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Bạn không thuộc mối quan hệ này!");
        }
    }
}
