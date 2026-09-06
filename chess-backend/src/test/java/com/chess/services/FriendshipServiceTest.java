package com.chess.services;

import com.chess.dto.request.SendFriendRequest;
import com.chess.dto.response.FriendDTO;
import com.chess.dto.response.FriendRequestDTO;
import com.chess.dto.response.FriendshipStatusResponseDTO;
import com.chess.dto.response.SendFriendResponse;
import com.chess.enums.FriendshipStatus;
import com.chess.models.Friendship;
import com.chess.models.User;
import com.chess.repositories.FriendshipRepository;
import com.chess.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private FriendshipRepository friendshipRepository;

    @Mock
    private UserPresenceService userPresenceService;

    @InjectMocks
    private FriendshipService friendshipService;

    private User sender;
    private User receiver;
    private SendFriendRequest request;

    @BeforeEach
    void setUp() {
        sender = User.builder().id(1L).username("alice").email("alice@chess.com").eloRating(1200).build();
        receiver = User.builder().id(2L).username("bob").email("bob@chess.com").eloRating(1300).build();
        request = new SendFriendRequest();
    }

    @Test
    @DisplayName("Gửi lời mời kết bạn mới thành công")
    void sendFriendRequest_Success_NewFriendship() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findById(2L)).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findFriendshipBetweenUsers(1L, 2L)).thenReturn(Optional.empty());
        when(friendshipRepository.save(any(Friendship.class))).thenAnswer(invocation -> {
            Friendship f = invocation.getArgument(0);
            f.setId(10L);
            return f;
        });

        SendFriendResponse response = friendshipService.sendFriendRequest(1L, 2L, request);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals(1L, response.getSenderId());
        assertEquals(2L, response.getReceiverId());
        assertEquals(FriendshipStatus.PENDING, response.getStatus());
        verify(friendshipRepository, times(1)).save(any(Friendship.class));
    }

    @Test
    @DisplayName("Gửi lời mời kết bạn lại khi đã từng bị từ chối/hủy (Reopen)")
    void sendFriendRequest_Success_ReopenOldFriendship() {
        Friendship oldFriendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.CANCELLED)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findById(2L)).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findFriendshipBetweenUsers(1L, 2L)).thenReturn(Optional.of(oldFriendship));
        when(friendshipRepository.save(any(Friendship.class))).thenReturn(oldFriendship);

        SendFriendResponse response = friendshipService.sendFriendRequest(1L, 2L, request);

        assertNotNull(response);
        assertEquals(FriendshipStatus.PENDING, response.getStatus());
        verify(friendshipRepository, times(1)).save(oldFriendship);
    }

    @Test
    @DisplayName("Không thể gửi kết bạn cho chính mình")
    void sendFriendRequest_Self_ThrowsException() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> friendshipService.sendFriendRequest(1L, 1L, request)
        );
        assertEquals("Không thể tự gửi kết bạn cho chính mình!", exception.getMessage());
    }

    @Test
    @DisplayName("Không thể gửi kết bạn khi đã là bạn bè")
    void sendFriendRequest_AlreadyFriends_ThrowsException() {
        Friendship friendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findById(2L)).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findFriendshipBetweenUsers(1L, 2L)).thenReturn(Optional.of(friendship));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> friendshipService.sendFriendRequest(1L, 2L, request)
        );
        assertEquals("Hai người đã là bạn bè!", exception.getMessage());
    }

    @Test
    @DisplayName("Chấp nhận lời mời kết bạn theo targetUserId thành công")
    void acceptFriendRequestByTargetUser_Success() {
        Friendship friendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.PENDING)
                .build();

        when(friendshipRepository.findFriendshipBetweenUsers(1L, 2L)).thenReturn(Optional.of(friendship));
        when(friendshipRepository.save(any(Friendship.class))).thenReturn(friendship);

        SendFriendResponse response = friendshipService.acceptFriendRequestByTargetUser(1L, 2L);

        assertNotNull(response);
        assertEquals(FriendshipStatus.ACCEPTED, response.getStatus());
    }

    @Test
    @DisplayName("Từ chối lời mời kết bạn theo friendshipId thành công")
    void rejectFriendRequest_Success() {
        Friendship friendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.PENDING)
                .build();

        when(friendshipRepository.findById(10L)).thenReturn(Optional.of(friendship));
        when(friendshipRepository.save(any(Friendship.class))).thenReturn(friendship);

        SendFriendResponse response = friendshipService.rejectFriendRequest(10L, 2L);

        assertNotNull(response);
        assertEquals(FriendshipStatus.REJECTED, response.getStatus());
    }

    @Test
    @DisplayName("Thu hồi lời mời kết bạn đã gửi thành công")
    void cancelFriendRequest_Success() {
        Friendship friendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.PENDING)
                .build();

        when(friendshipRepository.findById(10L)).thenReturn(Optional.of(friendship));
        when(friendshipRepository.save(any(Friendship.class))).thenReturn(friendship);

        SendFriendResponse response = friendshipService.cancelFriendRequest(10L, 1L);

        assertNotNull(response);
        assertEquals(FriendshipStatus.CANCELLED, response.getStatus());
    }

    @Test
    @DisplayName("Hủy kết bạn (unfriend) thành công")
    void unfriend_Success() {
        Friendship friendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(friendshipRepository.findFriendshipBetweenUsers(2L, 1L)).thenReturn(Optional.of(friendship));

        friendshipService.unfriend(2L, 1L);

        assertEquals(FriendshipStatus.CANCELLED, friendship.getStatus());
        verify(friendshipRepository, times(1)).save(friendship);
    }

    @Test
    @DisplayName("Chặn người dùng khi đã có quan hệ bạn bè trước đó")
    void blockUser_WhenFriendshipExists_Success() {
        Friendship friendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(friendshipRepository.findFriendshipBetweenUsers(2L, 1L)).thenReturn(Optional.of(friendship));

        friendshipService.blockUser(2L, 1L);

        assertEquals(FriendshipStatus.BLOCKED_BY_USER1, friendship.getStatus());
        verify(friendshipRepository, times(1)).save(friendship);
    }

    @Test
    @DisplayName("Chặn người dùng khi chưa từng có quan hệ bạn bè")
    void blockUser_WhenNoFriendship_Success() {
        when(friendshipRepository.findFriendshipBetweenUsers(2L, 1L)).thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(userRepository.findById(2L)).thenReturn(Optional.of(receiver));

        friendshipService.blockUser(2L, 1L);

        verify(friendshipRepository, times(1)).save(argThat(f ->
                f.getUser1().equals(sender) &&
                f.getUser2().equals(receiver) &&
                f.getStatus() == FriendshipStatus.BLOCKED_BY_USER1
        ));
    }

    @Test
    @DisplayName("Bỏ chặn người dùng thành công")
    void unblockUser_Success() {
        Friendship friendship = Friendship.builder()
                .id(10L)
                .user1(sender)
                .user2(receiver)
                .status(FriendshipStatus.BLOCKED_BY_USER1)
                .build();

        when(friendshipRepository.findFriendshipBetweenUsers(2L, 1L)).thenReturn(Optional.of(friendship));

        friendshipService.unblockUser(2L, 1L);

        assertEquals(FriendshipStatus.CANCELLED, friendship.getStatus());
        verify(friendshipRepository, times(1)).save(friendship);
    }

    @Test
    @DisplayName("Lấy danh sách bạn bè chính xác")
    void getFriendsList_Success() {
        Friendship f1 = Friendship.builder().id(10L).user1(sender).user2(receiver).status(FriendshipStatus.ACCEPTED).build();
        when(friendshipRepository.findAcceptedFriendshipsByUserId(1L)).thenReturn(List.of(f1));

        List<FriendDTO> friends = friendshipService.getFriendsList(1L);

        assertEquals(1, friends.size());
        assertEquals(2L, friends.get(0).getFriendId());
        assertEquals("bob", friends.get(0).getUsername());
    }

    @Test
    @DisplayName("Lấy danh sách lời mời nhận được")
    void getReceivedFriendRequests_Success() {
        Friendship f1 = Friendship.builder().id(10L).user1(sender).user2(receiver).status(FriendshipStatus.PENDING).build();
        when(friendshipRepository.findByUser2IdAndStatus(2L, FriendshipStatus.PENDING)).thenReturn(List.of(f1));

        List<FriendRequestDTO> requests = friendshipService.getReceivedFriendRequests(2L);

        assertEquals(1, requests.size());
        assertEquals(1L, requests.get(0).getRequesterId());
        assertEquals("alice", requests.get(0).getRequesterUsername());
    }

    @Test
    @DisplayName("Lấy danh sách lời mời đã gửi")
    void getSentFriendRequests_Success() {
        Friendship f1 = Friendship.builder().id(10L).user1(sender).user2(receiver).status(FriendshipStatus.PENDING).build();
        when(friendshipRepository.findByUser1IdAndStatus(1L, FriendshipStatus.PENDING)).thenReturn(List.of(f1));

        List<FriendRequestDTO> requests = friendshipService.getSentFriendRequests(1L);

        assertEquals(1, requests.size());
        assertEquals(2L, requests.get(0).getReceiverId());
        assertEquals("bob", requests.get(0).getReceiverUsername());
    }

    @Test
    @DisplayName("Kiểm tra trạng thái quan hệ: NONE, FRIEND, PENDING_SENT, PENDING_RECEIVED")
    void getFriendshipStatus_Scenarios() {
        // Scenario 1: NONE
        when(friendshipRepository.findFriendshipBetweenUsers(2L, 1L)).thenReturn(Optional.empty());
        FriendshipStatusResponseDTO status1 = friendshipService.getFriendshipStatus(2L, 1L);
        assertEquals("NONE", status1.getStatus());

        // Scenario 2: FRIEND
        Friendship fAccepted = Friendship.builder().id(10L).user1(sender).user2(receiver).status(FriendshipStatus.ACCEPTED).build();
        when(friendshipRepository.findFriendshipBetweenUsers(2L, 1L)).thenReturn(Optional.of(fAccepted));
        FriendshipStatusResponseDTO status2 = friendshipService.getFriendshipStatus(2L, 1L);
        assertEquals("FRIEND", status2.getStatus());

        // Scenario 3: PENDING_SENT (current user is sender: user1 = 1L (sender), current user = 1L)
        Friendship fPending = Friendship.builder().id(10L).user1(sender).user2(receiver).status(FriendshipStatus.PENDING).build();
        when(friendshipRepository.findFriendshipBetweenUsers(2L, 1L)).thenReturn(Optional.of(fPending));
        FriendshipStatusResponseDTO status3 = friendshipService.getFriendshipStatus(2L, 1L);
        assertEquals("PENDING_SENT", status3.getStatus());

        // Scenario 4: PENDING_RECEIVED (current user is receiver: user1 = 1L (sender), current user = 2L)
        when(friendshipRepository.findFriendshipBetweenUsers(1L, 2L)).thenReturn(Optional.of(fPending));
        FriendshipStatusResponseDTO status4 = friendshipService.getFriendshipStatus(1L, 2L);
        assertEquals("PENDING_RECEIVED", status4.getStatus());
    }
}
