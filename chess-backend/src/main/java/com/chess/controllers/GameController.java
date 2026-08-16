package com.chess.controllers;

import com.chess.dto.GameDTO;
import com.chess.dto.SaveGameRequest;
import com.chess.models.User;
import com.chess.repositories.UserRepository;
import com.chess.services.GameService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;
    private final UserRepository userRepository;

    private User getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping
    public ResponseEntity<?> saveGame(
            Authentication authentication,
            @Valid @RequestBody SaveGameRequest request) {
        try {
            User user = getCurrentUser(authentication);
            GameDTO saved = gameService.saveGame(user, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<Page<GameDTO>> getGames(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(gameService.getGames(user, page, Math.min(size, 50)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getGame(
            Authentication authentication,
            @PathVariable Long id) {
        try {
            User user = getCurrentUser(authentication);
            GameDTO game = gameService.getGameById(user, id);
            return ResponseEntity.ok(game);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
