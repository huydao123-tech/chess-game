package com.chess.repositories;

import com.chess.models.Tournament;
import com.chess.models.TournamentMatch;
import com.chess.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TournamentMatchRepository extends JpaRepository<TournamentMatch, Long> {

    List<TournamentMatch> findByTournament(Tournament tournament);

    List<TournamentMatch> findByTournamentId(Long tournamentId);

    List<TournamentMatch> findByTournamentIdOrderByRoundNumberAscMatchOrderAsc(Long tournamentId);

    List<TournamentMatch> findByTournamentIdAndRoundNumberOrderByMatchOrderAsc(Long tournamentId, Integer roundNumber);

    Optional<TournamentMatch> findByGameId(Long gameId);

    List<TournamentMatch> findByTournamentIdAndWhitePlayerOrTournamentIdAndBlackPlayer(
            Long tournamentId1, User whitePlayer,
            Long tournamentId2, User blackPlayer
    );
}
