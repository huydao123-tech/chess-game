package com.chess.models;

import com.chess.enums.FriendshipStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FriendshipTest {

    private User user1;
    private User user2;
    private User user3;

    @BeforeEach
    void setUp() {
        user1 = User.builder().id(1L).username("player1").email("p1@chess.com").build();
        user2 = User.builder().id(2L).username("player2").email("p2@chess.com").build();
        user3 = User.builder().id(3L).username("player3").email("p3@chess.com").build();
    }

    @Test
    @DisplayName("Tạo lời mời kết bạn thành công với trạng thái PENDING")
    void createRequest_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);

        assertNotNull(friendship);
        assertEquals(user1, friendship.getUser1());
        assertEquals(user2, friendship.getUser2());
        assertEquals(FriendshipStatus.PENDING, friendship.getStatus());
    }

    @Test
    @DisplayName("Không thể tự gửi lời mời kết bạn cho chính mình")
    void createRequest_SelfRequest_ThrowsException() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> Friendship.createRequest(user1, user1)
        );
        assertEquals("Không thể tự gửi kết bạn cho chính mình!", exception.getMessage());
    }

    @Test
    @DisplayName("Người nhận chấp nhận lời mời kết bạn thành công")
    void accept_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.accept(2L);

        assertEquals(FriendshipStatus.ACCEPTED, friendship.getStatus());
    }

    @Test
    @DisplayName("Chỉ người nhận mới có quyền chấp nhận lời mời kết bạn")
    void accept_NotReceiver_ThrowsException() {
        Friendship friendship = Friendship.createRequest(user1, user2);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> friendship.accept(1L)
        );
        assertEquals("Chỉ người nhận mới có quyền chấp nhận lời mời kết bạn!", exception.getMessage());
    }

    @Test
    @DisplayName("Không thể chấp nhận lời mời không ở trạng thái PENDING")
    void accept_NotPending_ThrowsException() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.accept(2L); // Trạng thái chuyển sang ACCEPTED

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> friendship.accept(2L)
        );
        assertEquals("Lời mời kết bạn không ở trạng thái chờ duyệt!", exception.getMessage());
    }

    @Test
    @DisplayName("Người nhận từ chối lời mời kết bạn thành công")
    void reject_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.reject(2L);

        assertEquals(FriendshipStatus.REJECTED, friendship.getStatus());
    }

    @Test
    @DisplayName("Chỉ người nhận mới có quyền từ chối lời mời kết bạn")
    void reject_NotReceiver_ThrowsException() {
        Friendship friendship = Friendship.createRequest(user1, user2);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> friendship.reject(1L)
        );
        assertEquals("Chỉ người nhận mới có quyền từ chối lời mời này!", exception.getMessage());
    }

    @Test
    @DisplayName("Người gửi thu hồi lời mời kết bạn thành công")
    void cancel_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.cancel(1L);

        assertEquals(FriendshipStatus.CANCELLED, friendship.getStatus());
    }

    @Test
    @DisplayName("Chỉ người gửi mới có quyền thu hồi lời mời kết bạn")
    void cancel_NotSender_ThrowsException() {
        Friendship friendship = Friendship.createRequest(user1, user2);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> friendship.cancel(2L)
        );
        assertEquals("Chỉ người gửi mới có quyền thu hồi lời mời kết bạn!", exception.getMessage());
    }

    @Test
    @DisplayName("Hủy kết bạn thành công khi hai người đang là bạn bè")
    void unfriend_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.accept(2L);

        friendship.unfriend(1L);
        assertEquals(FriendshipStatus.CANCELLED, friendship.getStatus());
    }

    @Test
    @DisplayName("Không thể hủy kết bạn khi chưa là bạn bè")
    void unfriend_NotAccepted_ThrowsException() {
        Friendship friendship = Friendship.createRequest(user1, user2);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> friendship.unfriend(1L)
        );
        assertEquals("Hai người chưa phải là bạn bè!", exception.getMessage());
    }

    @Test
    @DisplayName("Người ngoài không thể hủy kết bạn của người khác")
    void unfriend_NotMember_ThrowsException() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.accept(2L);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> friendship.unfriend(3L)
        );
        assertEquals("Bạn không thuộc mối quan hệ này!", exception.getMessage());
    }

    @Test
    @DisplayName("Chặn người dùng thành công")
    void block_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);

        friendship.block(1L);
        assertEquals(FriendshipStatus.BLOCKED_BY_USER1, friendship.getStatus());

        Friendship friendship2 = Friendship.createRequest(user1, user2);
        friendship2.block(2L);
        assertEquals(FriendshipStatus.BLOCKED_BY_USER2, friendship2.getStatus());
    }

    @Test
    @DisplayName("Bỏ chặn người dùng thành công")
    void unblock_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.block(1L);

        friendship.unblock(1L);
        assertEquals(FriendshipStatus.CANCELLED, friendship.getStatus());
    }

    @Test
    @DisplayName("Người bị chặn không thể tự ý bỏ chặn")
    void unblock_NotBlocker_ThrowsException() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.block(1L);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> friendship.unblock(2L)
        );
        assertEquals("Bạn không có quyền bỏ chặn mối quan hệ này!", exception.getMessage());
    }

    @Test
    @DisplayName("Gửi lại lời mời kết bạn (reopen) khi đã bị hủy hoặc từ chối trước đó")
    void reopen_Success() {
        Friendship friendship = Friendship.createRequest(user1, user2);
        friendship.cancel(1L);

        friendship.reopen(user2, user1);
        assertEquals(user2, friendship.getUser1());
        assertEquals(user1, friendship.getUser2());
        assertEquals(FriendshipStatus.PENDING, friendship.getStatus());
    }
}
