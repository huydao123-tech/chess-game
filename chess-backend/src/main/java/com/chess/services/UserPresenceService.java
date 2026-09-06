package com.chess.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserPresenceService {

    private final SimpMessagingTemplate messagingTemplate;

    // Map sessionId -> userId
    private final Map<String, Long> sessionToUserMap = new ConcurrentHashMap<>();
    // Map userId -> Set of sessionIds (a user might open multiple tabs)
    private final Map<Long, Set<String>> userToSessionsMap = new ConcurrentHashMap<>();
    // Map userId -> username
    private final Map<Long, String> userIdToUsernameMap = new ConcurrentHashMap<>();

    public void userConnected(Long userId, String username, String sessionId) {
        if (userId == null || sessionId == null) return;

        sessionToUserMap.put(sessionId, userId);
        if (username != null) {
            userIdToUsernameMap.put(userId, username);
        }

        userToSessionsMap.compute(userId, (k, sessions) -> {
            if (sessions == null) {
                sessions = ConcurrentHashMap.newKeySet();
            }
            boolean wasEmpty = sessions.isEmpty();
            sessions.add(sessionId);
            if (wasEmpty) {
                broadcastPresenceChange(userId, username, true);
            }
            return sessions;
        });

        log.info("User {} (ID: {}) connected with session {}", username, userId, sessionId);
    }

    public void userDisconnected(String sessionId) {
        if (sessionId == null) return;

        Long userId = sessionToUserMap.remove(sessionId);
        if (userId != null) {
            userToSessionsMap.computeIfPresent(userId, (k, sessions) -> {
                sessions.remove(sessionId);
                if (sessions.isEmpty()) {
                    String username = userIdToUsernameMap.get(userId);
                    broadcastPresenceChange(userId, username, false);
                    return null; // remove key
                }
                return sessions;
            });
            log.info("Session {} disconnected for user ID {}", sessionId, userId);
        }
    }

    public boolean isUserOnline(Long userId) {
        if (userId == null) return false;
        Set<String> sessions = userToSessionsMap.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public Set<Long> getOnlineUserIds() {
        return Collections.unmodifiableSet(new HashSet<>(userToSessionsMap.keySet()));
    }

    public void broadcastPresenceChange(Long userId, String username, boolean isOnline) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", userId);
            payload.put("username", username);
            payload.put("isOnline", isOnline);
            payload.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/presence", payload);
            log.info("Broadcast presence: User {} ({}) is now {}", username, userId, isOnline ? "ONLINE" : "OFFLINE");
        } catch (Exception e) {
            log.error("Failed to broadcast presence change", e);
        }
    }
}
