package com.chess.controllers;

import com.chess.dto.ChallengeEventDTO;
import com.chess.services.ChallengeService;
import com.chess.services.UserPresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WsChallengeController {

    private final UserPresenceService userPresenceService;
    private final ChallengeService challengeService;

    @MessageMapping("/presence/online")
    public void registerPresence(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        if (payload != null && payload.get("userId") != null) {
            Long userId = Long.valueOf(payload.get("userId").toString());
            String username = payload.get("username") != null ? payload.get("username").toString() : null;
            userPresenceService.userConnected(userId, username, sessionId);
        }
    }

    @MessageMapping("/presence/offline")
    public void unregisterPresence(SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        userPresenceService.userDisconnected(sessionId);
    }

    @MessageMapping("/challenge/send")
    public void sendChallenge(@Payload ChallengeEventDTO request) {
        try {
            challengeService.sendChallenge(request);
        } catch (Exception e) {
            log.error("Error sending challenge: {}", e.getMessage());
        }
    }

    @MessageMapping("/challenge/accept")
    public void acceptChallenge(@Payload ChallengeEventDTO request) {
        try {
            challengeService.acceptChallenge(request.getChallengeId(), request.getTargetUserId());
        } catch (Exception e) {
            log.error("Error accepting challenge: {}", e.getMessage());
        }
    }

    @MessageMapping("/challenge/decline")
    public void declineChallenge(@Payload ChallengeEventDTO request) {
        try {
            challengeService.declineChallenge(request.getChallengeId(), request.getTargetUserId());
        } catch (Exception e) {
            log.error("Error declining challenge: {}", e.getMessage());
        }
    }

    @MessageMapping("/challenge/cancel")
    public void cancelChallenge(@Payload ChallengeEventDTO request) {
        try {
            challengeService.cancelChallenge(request.getChallengeId(), request.getChallengerId());
        } catch (Exception e) {
            log.error("Error cancelling challenge: {}", e.getMessage());
        }
    }
}
