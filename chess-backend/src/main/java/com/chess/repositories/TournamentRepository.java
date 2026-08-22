package com.chess.repositories;

import com.chess.models.Game;
import com.chess.models.User;
import com.chess.models.Tournament;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import javax.swing.text.html.Option;
import java.util.List;
import java.util.Optional;

@Repository
public interface TournamentRepository extends JpaRepository<Tournament, Long> {
    Optional<Tournament> findById(Long id);
}
