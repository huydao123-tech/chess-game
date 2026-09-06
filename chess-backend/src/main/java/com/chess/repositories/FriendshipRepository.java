package com.chess.repositories;


import com.chess.models.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.chess.enums.FriendshipStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("SELECT f FROM Friendship f WHERE (f.user1.id = :u1Id AND f.user2.id = :u2Id) OR (f.user1.id = :u2Id AND f.user2.id = :u1Id)")
    Optional<Friendship> findFriendshipBetweenUsers(@Param("u1Id") Long u1Id, @Param("u2Id") Long u2Id);

    @Query("SELECT f FROM Friendship f WHERE (f.user1.id = :userId OR f.user2.id = :userId) AND f.status = 'ACCEPTED'")
    List<Friendship> findAcceptedFriendshipsByUserId(@Param("userId") Long userId);

    List<Friendship> findByUser2IdAndStatus(Long receiverId, FriendshipStatus status);

    List<Friendship> findByUser1IdAndStatus(Long senderId, FriendshipStatus status);

    @Query("SELECT f FROM Friendship f WHERE (f.user1.id = :userId AND f.status = 'BLOCKED_BY_USER1') OR (f.user2.id = :userId AND f.status = 'BLOCKED_BY_USER2')")
    List<Friendship> findBlockedFriendshipsByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(f) FROM Friendship f WHERE (f.user1.id = :userId OR f.user2.id = :userId) AND f.status = 'ACCEPTED'")
    long countFriendsByUserId(@Param("userId") Long userId);
}
