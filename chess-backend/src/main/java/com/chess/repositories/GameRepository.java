package com.chess.repositories;

import com.chess.models.Game;
import com.chess.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    Page<Game> findByUserOrderByPlayedAtDesc(User user, Pageable pageable);
    List<Game> findByUserOrderByPlayedAtDesc(User user);
    Optional<Game> findByIdAndUser(Long id, User user);
    long countByUserAndResult(User user, String result);

    @Query("SELECT g FROM Game g WHERE g.user = :user ORDER BY g.playedAt DESC")
    List<Game> findRecentByUser(User user, Pageable pageable);
}
