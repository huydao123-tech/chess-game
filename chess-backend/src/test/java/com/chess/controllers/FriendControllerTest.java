package com.chess.controllers;

import com.chess.dto.request.SendFriendRequest;
import com.chess.dto.response.FriendDTO;
import com.chess.dto.response.FriendRequestDTO;
import com.chess.dto.response.FriendshipStatusResponseDTO;
import com.chess.dto.response.SendFriendResponse;
import com.chess.enums.FriendshipStatus;
import com.chess.exceptions.GlobalExceptionHandler;
import com.chess.models.User;
import com.chess.repositories.UserRepository;
import com.chess.services.FriendshipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class FriendControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FriendshipService friendshipService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private FriendController friendController;

    private User currentUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(friendController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        currentUser = User.builder()
                .id(1L)
                .username("currentUser")
                .email("user@chess.com")
                .build();
    }

    private void mockAuthentication() {
        when(authentication.getName()).thenReturn("currentUser");
        when(userRepository.findByUsername("currentUser")).thenReturn(Optional.of(currentUser));
    }

    @Test
    @DisplayName("POST /api/friend/send/{targetUserId} - Gửi kết bạn thành công")
    void sendFriendRequest_Success() throws Exception {
        mockAuthentication();
        SendFriendResponse response = SendFriendResponse.builder()
                .id(10L)
                .senderId(1L)
                .receiverId(2L)
                .status(FriendshipStatus.PENDING)
                .build();

        when(friendshipService.sendFriendRequest(eq(1L), eq(2L), any(SendFriendRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/friend/send/2")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Xin chao\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.senderId").value(1))
                .andExpect(jsonPath("$.receiverId").value(2))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("POST /api/friend/accept/{friendshipId} - Chấp nhận lời mời theo ID")
    void acceptFriendRequest_Success() throws Exception {
        mockAuthentication();
        SendFriendResponse response = SendFriendResponse.builder()
                .id(10L)
                .senderId(2L)
                .receiverId(1L)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(friendshipService.acceptFriendRequest(10L, 1L)).thenReturn(response);

        mockMvc.perform(post("/api/friend/accept/10")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    @DisplayName("POST /api/friend/accept/user/{targetUserId} - Chấp nhận lời mời theo User ID")
    void acceptFriendRequestByTargetUser_Success() throws Exception {
        mockAuthentication();
        SendFriendResponse response = SendFriendResponse.builder()
                .id(10L)
                .senderId(2L)
                .receiverId(1L)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(friendshipService.acceptFriendRequestByTargetUser(2L, 1L)).thenReturn(response);

        mockMvc.perform(post("/api/friend/accept/user/2")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    @DisplayName("POST /api/friend/reject/{friendshipId} - Từ chối lời mời")
    void rejectFriendRequest_Success() throws Exception {
        mockAuthentication();
        SendFriendResponse response = SendFriendResponse.builder()
                .id(10L)
                .status(FriendshipStatus.REJECTED)
                .build();

        when(friendshipService.rejectFriendRequest(10L, 1L)).thenReturn(response);

        mockMvc.perform(post("/api/friend/reject/10")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    @DisplayName("POST /api/friend/cancel/{friendshipId} - Thu hồi lời mời")
    void cancelFriendRequest_Success() throws Exception {
        mockAuthentication();
        SendFriendResponse response = SendFriendResponse.builder()
                .id(10L)
                .status(FriendshipStatus.CANCELLED)
                .build();

        when(friendshipService.cancelFriendRequest(10L, 1L)).thenReturn(response);

        mockMvc.perform(post("/api/friend/cancel/10")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    @DisplayName("DELETE /api/friend/unfriend/{targetUserId} - Hủy kết bạn")
    void unfriend_Success() throws Exception {
        mockAuthentication();

        mockMvc.perform(delete("/api/friend/unfriend/2")
                        .principal(authentication))
                .andExpect(status().isOk());

        verify(friendshipService).unfriend(2L, 1L);
    }

    @Test
    @DisplayName("POST /api/friend/block/{targetUserId} - Chặn người dùng")
    void blockUser_Success() throws Exception {
        mockAuthentication();

        mockMvc.perform(post("/api/friend/block/2")
                        .principal(authentication))
                .andExpect(status().isOk());

        verify(friendshipService).blockUser(2L, 1L);
    }

    @Test
    @DisplayName("POST /api/friend/unblock/{targetUserId} - Bỏ chặn người dùng")
    void unblockUser_Success() throws Exception {
        mockAuthentication();

        mockMvc.perform(post("/api/friend/unblock/2")
                        .principal(authentication))
                .andExpect(status().isOk());

        verify(friendshipService).unblockUser(2L, 1L);
    }

    @Test
    @DisplayName("GET /api/friend/list - Lấy danh sách bạn bè")
    void getFriendsList_Success() throws Exception {
        mockAuthentication();
        FriendDTO friend = FriendDTO.builder()
                .friendshipId(10L)
                .friendId(2L)
                .username("bob")
                .eloRating(1400)
                .status(FriendshipStatus.ACCEPTED)
                .build();

        when(friendshipService.getFriendsList(1L)).thenReturn(List.of(friend));

        mockMvc.perform(get("/api/friend/list")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].friendId").value(2))
                .andExpect(jsonPath("$[0].username").value("bob"));
    }

    @Test
    @DisplayName("GET /api/friend/requests/received - Lấy danh sách lời mời nhận được")
    void getReceivedFriendRequests_Success() throws Exception {
        mockAuthentication();
        FriendRequestDTO req = FriendRequestDTO.builder()
                .friendshipId(10L)
                .requesterId(2L)
                .requesterUsername("bob")
                .receiverId(1L)
                .build();

        when(friendshipService.getReceivedFriendRequests(1L)).thenReturn(List.of(req));

        mockMvc.perform(get("/api/friend/requests/received")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requesterUsername").value("bob"));
    }

    @Test
    @DisplayName("GET /api/friend/requests/sent - Lấy danh sách lời mời đã gửi")
    void getSentFriendRequests_Success() throws Exception {
        mockAuthentication();
        FriendRequestDTO req = FriendRequestDTO.builder()
                .friendshipId(10L)
                .requesterId(1L)
                .receiverId(2L)
                .receiverUsername("bob")
                .build();

        when(friendshipService.getSentFriendRequests(1L)).thenReturn(List.of(req));

        mockMvc.perform(get("/api/friend/requests/sent")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].receiverUsername").value("bob"));
    }

    @Test
    @DisplayName("GET /api/friend/status/{targetUserId} - Kiểm tra trạng thái bạn bè")
    void getFriendshipStatus_Success() throws Exception {
        mockAuthentication();
        FriendshipStatusResponseDTO statusDTO = FriendshipStatusResponseDTO.builder()
                .targetUserId(2L)
                .status("FRIEND")
                .friendshipId(10L)
                .build();

        when(friendshipService.getFriendshipStatus(2L, 1L)).thenReturn(statusDTO);

        mockMvc.perform(get("/api/friend/status/2")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FRIEND"))
                .andExpect(jsonPath("$.friendshipId").value(10));
    }
}
