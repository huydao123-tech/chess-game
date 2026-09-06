package com.chess.services;

import com.chess.dto.ChallengeEventDTO;
import com.chess.models.User;
import com.chess.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChallengeService {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserPresenceService userPresenceService;
    private final UserRepository userRepository;

    // Map challengeId -> ChallengeEventDTO
    private final Map<String, ChallengeEventDTO> pendingChallenges = new ConcurrentHashMap<>();

    public ChallengeEventDTO sendChallenge(ChallengeEventDTO request) {
        if (request.getChallengerId() == null || request.getTargetUserId() == null) {
            throw new IllegalArgumentException("Thông tin người gửi hoặc người nhận không hợp lệ");
        }

        if (request.getChallengerId().equals(request.getTargetUserId())) {
            throw new IllegalArgumentException("Không thể tự thách đấu chính mình");
        }

        User challenger = userRepository.findById(request.getChallengerId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người thách đấu"));
        User target = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người được thách đấu"));

        String challengeId = UUID.randomUUID().toString().substring(0, 8);
        int timeControl = request.getTimeControl() != null ? request.getTimeControl() : 300;

        ChallengeEventDTO challenge = ChallengeEventDTO.builder()
                .type("CHALLENGE_RECEIVED")
                .challengeId(challengeId)
                .challengerId(challenger.getId())
                .challengerUsername(challenger.getUsername())
                .challengerAvatarUrl(challenger.getAvatarUrl())
                .challengerElo(challenger.getEloRating())
                .targetUserId(target.getId())
                .targetUsername(target.getUsername())
                .timeControl(timeControl)
                .build();

        pendingChallenges.put(challengeId, challenge);

        // Gửi thông báo tới người nhận qua kênh WebSocket cá nhân
        messagingTemplate.convertAndSend("/topic/user/" + target.getId() + "/challenge", challenge);
        log.info("Sent challenge {} from {} to {}", challengeId, challenger.getUsername(), target.getUsername());

        return challenge;
    }

    public ChallengeEventDTO acceptChallenge(String challengeId, Long currentUserId) {
        ChallengeEventDTO challenge = pendingChallenges.get(challengeId);
        if (challenge == null) {
            throw new IllegalStateException("Lời thách đấu không tồn tại hoặc đã hết hạn!");
        }

        if (!challenge.getTargetUserId().equals(currentUserId)) {
            throw new IllegalArgumentException("Bạn không có quyền chấp nhận lời thách đấu này!");
        }

        // KIỂM TRA QUAN TRỌNG: Người gửi thách đấu có còn Online hay không?
        boolean isChallengerOnline = userPresenceService.isUserOnline(challenge.getChallengerId());
        if (!isChallengerOnline) {
            pendingChallenges.remove(challengeId);

            ChallengeEventDTO failedEvent = ChallengeEventDTO.builder()
                    .type("CHALLENGE_FAILED_OFFLINE")
                    .challengeId(challengeId)
                    .challengerId(challenge.getChallengerId())
                    .challengerUsername(challenge.getChallengerUsername())
                    .targetUserId(currentUserId)
                    .message("Người gửi thách đấu đã offline / không còn trực tuyến!")
                    .build();

            // Gửi thông báo lỗi cho người nhận
            messagingTemplate.convertAndSend("/topic/user/" + currentUserId + "/challenge", failedEvent);
            log.warn("Challenge {} failed because challenger {} is offline", challengeId, challenge.getChallengerUsername());
            return failedEvent;
        }

        // Nếu người gửi còn online -> Tạo phòng và bắt đầu trận đấu
        pendingChallenges.remove(challengeId);
        String roomId = "CHALLENGE_" + challengeId.toUpperCase();

        // 1. Gửi cho Challenger (Người tạo trận - Cầm trắng/Host)
        ChallengeEventDTO startForChallenger = ChallengeEventDTO.builder()
                .type("CHALLENGE_START")
                .challengeId(challengeId)
                .roomId(roomId)
                .isHost(true)
                .opponentUsername(challenge.getTargetUsername())
                .timeControl(challenge.getTimeControl())
                .build();
        messagingTemplate.convertAndSend("/topic/user/" + challenge.getChallengerId() + "/challenge", startForChallenger);

        // 2. Gửi cho Target (Khách - Cầm đen)
        ChallengeEventDTO startForTarget = ChallengeEventDTO.builder()
                .type("CHALLENGE_START")
                .challengeId(challengeId)
                .roomId(roomId)
                .isHost(false)
                .opponentUsername(challenge.getChallengerUsername())
                .timeControl(challenge.getTimeControl())
                .build();
        messagingTemplate.convertAndSend("/topic/user/" + challenge.getTargetUserId() + "/challenge", startForTarget);

        log.info("Challenge {} accepted. Game room {} created for {} vs {}",
                challengeId, roomId, challenge.getChallengerUsername(), challenge.getTargetUsername());

        return startForTarget;
    }

    public void declineChallenge(String challengeId, Long currentUserId) {
        ChallengeEventDTO challenge = pendingChallenges.remove(challengeId);
        if (challenge != null) {
            ChallengeEventDTO declinedEvent = ChallengeEventDTO.builder()
                    .type("CHALLENGE_DECLINED")
                    .challengeId(challengeId)
                    .challengerId(challenge.getChallengerId())
                    .opponentUsername(challenge.getTargetUsername())
                    .message(challenge.getTargetUsername() + " đã từ chối lời thách đấu.")
                    .build();

            messagingTemplate.convertAndSend("/topic/user/" + challenge.getChallengerId() + "/challenge", declinedEvent);
            log.info("Challenge {} declined by {}", challengeId, challenge.getTargetUsername());
        }
    }

    public void cancelChallenge(String challengeId, Long currentUserId) {
        ChallengeEventDTO challenge = pendingChallenges.remove(challengeId);
        if (challenge != null) {
            ChallengeEventDTO cancelledEvent = ChallengeEventDTO.builder()
                    .type("CHALLENGE_CANCELLED")
                    .challengeId(challengeId)
                    .targetUserId(challenge.getTargetUserId())
                    .message("Lời thách đấu đã được thu hồi bởi người gửi.")
                    .build();

            messagingTemplate.convertAndSend("/topic/user/" + challenge.getTargetUserId() + "/challenge", cancelledEvent);
            log.info("Challenge {} cancelled by challenger {}", challengeId, challenge.getChallengerUsername());
        }
    }

    public ChallengeEventDTO getPendingChallenge(String challengeId) {
        return pendingChallenges.get(challengeId);
    }
}
