package com.chess.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserPresenceServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private UserPresenceService userPresenceService;

    @BeforeEach
    void setUp() {
    }

    @Test
    @DisplayName("Người dùng kết nối -> Trạng thái chuyển sang Online và phát broadcast")
    void userConnected_Success() {
        userPresenceService.userConnected(1L, "alice", "session-123");

        assertTrue(userPresenceService.isUserOnline(1L));
        Set<Long> onlineUsers = userPresenceService.getOnlineUserIds();
        assertTrue(onlineUsers.contains(1L));

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/presence"), anyMap());
    }

    @Test
    @DisplayName("Người dùng mở nhiều tab -> Đóng 1 tab vẫn giữ trạng thái Online")
    void multipleSessions_StayOnlineUntilAllClosed() {
        userPresenceService.userConnected(1L, "alice", "session-tab1");
        userPresenceService.userConnected(1L, "alice", "session-tab2");

        assertTrue(userPresenceService.isUserOnline(1L));

        // Đóng tab 1
        userPresenceService.userDisconnected("session-tab1");
        assertTrue(userPresenceService.isUserOnline(1L)); // Vẫn online do tab 2 còn mở

        // Đóng tab 2
        userPresenceService.userDisconnected("session-tab2");
        assertFalse(userPresenceService.isUserOnline(1L)); // Đã offline
    }

    @Test
    @DisplayName("Người dùng ngắt kết nối -> Trạng thái chuyển sang Offline")
    void userDisconnected_Success() {
        userPresenceService.userConnected(2L, "bob", "session-456");
        assertTrue(userPresenceService.isUserOnline(2L));

        userPresenceService.userDisconnected("session-456");
        assertFalse(userPresenceService.isUserOnline(2L));

        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/presence"), anyMap()); // 1 online + 1 offline
    }
}
