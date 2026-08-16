package com.chess.services;

import com.chess.dto.GameDTO;
import com.chess.dto.SaveGameRequest;
import com.chess.dto.StatsDTO;
import com.chess.models.Game;
import com.chess.models.User;
import com.chess.repositories.GameRepository;
import com.chess.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GameService {

    private final GameRepository gameRepository;
    private final UserRepository userRepository;

    @Transactional
    public GameDTO saveGame(User user, SaveGameRequest request) {
        int eloBefore = user.getEloRating();
        int eloChange = calculateEloChange(user.getEloRating(), request.getAiLevel(), request.getResult());
        int eloAfter = Math.max(100, eloBefore + eloChange); // floor at 100

        // Update user stats
        user.setEloRating(eloAfter);
        user.setTotalGames(user.getTotalGames() + 1);

        switch (request.getResult().toUpperCase()) {
            case "WIN" -> user.setWins(user.getWins() + 1);
            case "LOSS" -> user.setLosses(user.getLosses() + 1);
            case "DRAW" -> user.setDraws(user.getDraws() + 1);
        }

        userRepository.save(user);

        Game game = Game.builder()
                .user(user)
                .playerColor(request.getPlayerColor().toUpperCase())
                .aiLevel(request.getAiLevel())
                .result(request.getResult().toUpperCase())
                .pgn(request.getPgn())
                .finalFen(request.getFinalFen())
                .totalMoves(request.getTotalMoves() != null ? request.getTotalMoves() : 0)
                .durationSeconds(request.getDurationSeconds())
                .timeControl(request.getTimeControl())
                .eloBefore(eloBefore)
                .eloAfter(eloAfter)
                .eloChange(eloChange)
                .build();

        Game saved = gameRepository.save(game);
        return mapToDTO(saved, true);
    }

    public Page<GameDTO> getGames(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Game> games = gameRepository.findByUserOrderByPlayedAtDesc(user, pageable);
        return games.map(g -> mapToDTO(g, false));
    }

    public GameDTO getGameById(User user, Long id) {
        Game game = gameRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Game not found"));
        return mapToDTO(game, true);
    }

    public StatsDTO getStats(User user) {
        List<Game> allGames = gameRepository.findByUserOrderByPlayedAtDesc(user);

        int peakElo = allGames.stream()
                .mapToInt(g -> g.getEloAfter() != null ? g.getEloAfter() : 1200)
                .max()
                .orElse(user.getEloRating());

        double avgEloChange = allGames.stream()
                .mapToInt(g -> g.getEloChange() != null ? g.getEloChange() : 0)
                .average()
                .orElse(0.0);

        double winRate = user.getTotalGames() > 0
                ? (double) user.getWins() / user.getTotalGames() * 100
                : 0.0;

        return StatsDTO.builder()
                .currentElo(user.getEloRating())
                .totalGames(user.getTotalGames())
                .wins(user.getWins())
                .losses(user.getLosses())
                .draws(user.getDraws())
                .winRate(Math.round(winRate * 10.0) / 10.0)
                .peakElo(peakElo)
                .avgEloChange(Math.round(avgEloChange * 10.0) / 10.0)
                .build();
    }

    /**
     * ELO calculation: player vs AI using standard formula.
     * AI "rating" is estimated based on level (level 1 = ~600, level 20 = ~3500).
     */
    private int calculateEloChange(int playerElo, int aiLevel, String result) {
        // Estimate AI rating based on level
        int aiElo = 600 + (aiLevel - 1) * 150;

        double expectedScore = 1.0 / (1.0 + Math.pow(10, (aiElo - playerElo) / 400.0));
        double actualScore = switch (result.toUpperCase()) {
            case "WIN" -> 1.0;
            case "DRAW" -> 0.5;
            case "LOSS" -> 0.0;
            default -> 0.0;
        };

        int kFactor = playerElo < 1400 ? 32 : (playerElo < 2000 ? 24 : 16);
        return (int) Math.round(kFactor * (actualScore - expectedScore));
    }

    private GameDTO mapToDTO(Game game, boolean includePgn) {
        return GameDTO.builder()
                .id(game.getId())
                .playerColor(game.getPlayerColor())
                .aiLevel(game.getAiLevel())
                .result(game.getResult())
                .totalMoves(game.getTotalMoves())
                .durationSeconds(game.getDurationSeconds())
                .timeControl(game.getTimeControl())
                .eloBefore(game.getEloBefore())
                .eloAfter(game.getEloAfter())
                .eloChange(game.getEloChange())
                .playedAt(game.getPlayedAt())
                .finalFen(game.getFinalFen())
                .pgn(includePgn ? game.getPgn() : null)
                .build();
    }
}
