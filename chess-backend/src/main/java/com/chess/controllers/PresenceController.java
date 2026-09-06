package com.chess.controllers;

import com.chess.services.UserPresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final UserPresenceService userPresenceService;

    @GetMapping("/online")
    public ResponseEntity<Set<Long>> getOnlineUsers() {
        return ResponseEntity.ok(userPresenceService.getOnlineUserIds());
    }
}
