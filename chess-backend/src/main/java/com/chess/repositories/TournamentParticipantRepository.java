package com.chess.repositories;

import com.chess.models.Tournament;
import com.chess.models.TournamentParticipant;
import com.chess.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TournamentParticipantRepository extends JpaRepository<TournamentParticipant, Long> {
    List<TournamentParticipant> findByTournament(Tournament tournament);
    List<TournamentParticipant> findByUser(User user);
    Optional<TournamentParticipant> findByTournamentAndUser(Tournament tournament, User user);
    boolean existsByTournamentAndUser(Tournament tournament, User user);
}
