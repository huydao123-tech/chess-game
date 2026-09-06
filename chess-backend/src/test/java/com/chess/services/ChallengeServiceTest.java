package com.chess.services;

import com.chess.dto.ChallengeEventDTO;
import com.chess.models.User;
import com.chess.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.SimpMessagingTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChallengeServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private UserPresenceService userPresenceService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChallengeService challengeService;

    private User challenger;
    private User target;

    @BeforeEach
    void setUp() {
        challenger = User.builder().id(1L).username("alice").eloRating(1400).build();
        target = User.builder().id(2L).username("bob").eloRating(1350).build();
    }

    @Test
    @DisplayName("Gửi lời thách đấu thành công -> Phát tin nhắn tới người nhận")
    void sendChallenge_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(challenger));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        ChallengeEventDTO request = ChallengeEventDTO.builder()
                .challengerId(1L)
                .targetUserId(2L)
                .timeControl(300)
                .build();

        ChallengeEventDTO result = challengeService.sendChallenge(request);

        assertNotNull(result);
        assertEquals("CHALLENGE_RECEIVED", result.getType());
        assertEquals("alice", result.getChallengerUsername());
        assertEquals("bob", result.getTargetUsername());
        assertEquals(300, result.getTimeControl());

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/user/2/challenge"), any(ChallengeEventDTO.class));
    }

    @Test
    @DisplayName("Không thể tự thách đấu chính mình")
    void sendChallenge_Self_ThrowsException() {
        ChallengeEventDTO request = ChallengeEventDTO.builder()
                .challengerId(1L)
                .targetUserId(1L)
                .build();

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> challengeService.sendChallenge(request)
        );
        assertEquals("Không thể tự thách đấu chính mình", exception.getMessage());
    }

    @Test
    @DisplayName("Chấp nhận thách đấu khi Người gửi VẪN ONLINE -> Tạo phòng đấu thành công")
    void acceptChallenge_WhenChallengerIsOnline_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(challenger));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        ChallengeEventDTO request = ChallengeEventDTO.builder()
                .challengerId(1L)
                .targetUserId(2L)
                .timeControl(600)
                .build();
        ChallengeEventDTO created = challengeService.sendChallenge(request);

        // Giả lập Người gửi VẪN ONLINE
        when(userPresenceService.isUserOnline(1L)).thenReturn(true);

        ChallengeEventDTO startResult = challengeService.acceptChallenge(created.getChallengeId(), 2L);

        assertNotNull(startResult);
        assertEquals("CHALLENGE_START", startResult.getType());
        assertNotNull(startResult.getRoomId());
        assertEquals(false, startResult.getIsHost()); // target là guest (Black)

        // Phải gửi tin nhắn bắt đầu trận đấu tới cả 2 người
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/user/1/challenge"), any(ChallengeEventDTO.class));
        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/user/2/challenge"), any(ChallengeEventDTO.class)); // 1 received + 1 start
    }

    @Test
    @DisplayName("Chấp nhận thách đấu khi Người gửi ĐÃ OFFLINE -> Trả về lỗi CHALLENGE_FAILED_OFFLINE và không tạo phòng")
    void acceptChallenge_WhenChallengerIsOffline_Fails() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(challenger));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        ChallengeEventDTO request = ChallengeEventDTO.builder()
                .challengerId(1L)
                .targetUserId(2L)
                .timeControl(300)
                .build();
        ChallengeEventDTO created = challengeService.sendChallenge(request);

        // Giả lập Người gửi ĐÃ OFFLINE
        when(userPresenceService.isUserOnline(1L)).thenReturn(false);

        ChallengeEventDTO failedResult = challengeService.acceptChallenge(created.getChallengeId(), 2L);

        assertNotNull(failedResult);
        assertEquals("CHALLENGE_FAILED_OFFLINE", failedResult.getType());
        assertEquals("Người gửi thách đấu đã offline / không còn trực tuyến!", failedResult.getMessage());

        // Gửi thông báo lỗi cho target user
        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/user/2/challenge"), any(ChallengeEventDTO.class)); // 1 received + 1 failed
    }

    @Test
    @DisplayName("Từ chối lời thách đấu -> Thông báo tới người gửi")
    void declineChallenge_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(challenger));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        ChallengeEventDTO request = ChallengeEventDTO.builder()
                .challengerId(1L)
                .targetUserId(2L)
                .build();
        ChallengeEventDTO created = challengeService.sendChallenge(request);

        challengeService.declineChallenge(created.getChallengeId(), 2L);

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/user/1/challenge"), argThat((ChallengeEventDTO e) ->
                "CHALLENGE_DECLINED".equals(e.getType())
        ));
    }

    @Test
    @DisplayName("Người gửi hủy lời thách đấu -> Thông báo tới người nhận")
    void cancelChallenge_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(challenger));
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        ChallengeEventDTO request = ChallengeEventDTO.builder()
                .challengerId(1L)
                .targetUserId(2L)
                .build();
        ChallengeEventDTO created = challengeService.sendChallenge(request);

        challengeService.cancelChallenge(created.getChallengeId(), 1L);

        verify(messagingTemplate, times(2)).convertAndSend(eq("/topic/user/2/challenge"), argThat((ChallengeEventDTO e) ->
                "CHALLENGE_CANCELLED".equals(e.getType()) || "CHALLENGE_RECEIVED".equals(e.getType())
        ));
    }
}
