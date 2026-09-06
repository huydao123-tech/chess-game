package com.chess.repositories;

import com.chess.models.Game;
import com.chess.models.Tournament;
import com.chess.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByRefreshToken(String refreshToken);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findTop10ByOrderByEloRatingDesc();
    List<User> findTop5ByOrderByEloRatingDesc();
    Long countByEloRatingGreaterThan(Integer eloRating);


}
