package com.chess.controllers;

import com.chess.dto.UserDTO;
import com.chess.models.User;
import com.chess.repositories.UserRepository;
import com.chess.services.AuthService;
import com.chess.services.GameService;
import com.chess.dto.StatsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final GameService gameService;

    private User getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getProfile(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(authService.mapToDTO(user));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(
            Authentication authentication,
            @RequestBody Map<String, String> body) {
        User user = getCurrentUser(authentication);

        String newUsername = body.get("username");
        if (newUsername != null && !newUsername.isBlank()) {
            if (!newUsername.equals(user.getUsername()) &&
                    userRepository.existsByUsername(newUsername)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Username is already taken"));
            }
            user.setUsername(newUsername);
        }

        String avatarUrl = body.get("avatarUrl");
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl);
        }

        userRepository.save(user);
        return ResponseEntity.ok(authService.mapToDTO(user));
    }

    @GetMapping("/me/stats")
    public ResponseEntity<StatsDTO> getStats(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(gameService.getStats(user));
    }
}
