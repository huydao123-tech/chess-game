package com.chess.controllers;

import com.chess.dto.request.SendFriendRequest;
import com.chess.dto.response.FriendDTO;
import com.chess.dto.response.FriendRequestDTO;
import com.chess.dto.response.FriendshipStatusResponseDTO;
import com.chess.dto.response.SendFriendResponse;
import com.chess.models.User;
import com.chess.repositories.UserRepository;
import com.chess.services.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friend")
@RequiredArgsConstructor
public class FriendController {

    private final UserRepository userRepository;
    private final FriendshipService friendshipService;

    private User getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping("/send/{targetUserId}")
    public ResponseEntity<SendFriendResponse> sendFriendRequest(
            @RequestBody(required = false) SendFriendRequest request,
            Authentication authentication,
            @PathVariable Long targetUserId) {
        User user = getCurrentUser(authentication);
        if (request == null) {
            request = new SendFriendRequest();
        }
        return ResponseEntity.ok(friendshipService.sendFriendRequest(user.getId(), targetUserId, request));
    }

    @PostMapping("/accept/{friendshipId}")
    public ResponseEntity<SendFriendResponse> acceptFriendRequest(
            @PathVariable Long friendshipId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.acceptFriendRequest(friendshipId, user.getId()));
    }

    @PostMapping("/accept/user/{targetUserId}")
    public ResponseEntity<SendFriendResponse> acceptFriendRequestByTargetUser(
            @PathVariable Long targetUserId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.acceptFriendRequestByTargetUser(targetUserId, user.getId()));
    }

    @PostMapping("/reject/{friendshipId}")
    public ResponseEntity<SendFriendResponse> rejectFriendRequest(
            @PathVariable Long friendshipId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.rejectFriendRequest(friendshipId, user.getId()));
    }

    @PostMapping("/reject/user/{targetUserId}")
    public ResponseEntity<SendFriendResponse> rejectFriendRequestByTargetUser(
            @PathVariable Long targetUserId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.rejectFriendRequestByTargetUser(targetUserId, user.getId()));
    }

    @PostMapping("/cancel/{friendshipId}")
    public ResponseEntity<SendFriendResponse> cancelFriendRequest(
            @PathVariable Long friendshipId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.cancelFriendRequest(friendshipId, user.getId()));
    }

    @PostMapping("/cancel/user/{targetUserId}")
    public ResponseEntity<SendFriendResponse> cancelFriendRequestByTargetUser(
            @PathVariable Long targetUserId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.cancelFriendRequestByTargetUser(targetUserId, user.getId()));
    }

    @DeleteMapping("/unfriend/{targetUserId}")
    public ResponseEntity<Void> unfriend(
            @PathVariable Long targetUserId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        friendshipService.unfriend(targetUserId, user.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/block/{targetUserId}")
    public ResponseEntity<Void> blockUser(
            @PathVariable Long targetUserId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        friendshipService.blockUser(targetUserId, user.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unblock/{targetUserId}")
    public ResponseEntity<Void> unblockUser(
            @PathVariable Long targetUserId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        friendshipService.unblockUser(targetUserId, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/list")
    public ResponseEntity<List<FriendDTO>> getFriendsList(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.getFriendsList(user.getId()));
    }

    @GetMapping("/requests/received")
    public ResponseEntity<List<FriendRequestDTO>> getReceivedFriendRequests(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.getReceivedFriendRequests(user.getId()));
    }

    @GetMapping("/requests/sent")
    public ResponseEntity<List<FriendRequestDTO>> getSentFriendRequests(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.getSentFriendRequests(user.getId()));
    }

    @GetMapping("/blocked")
    public ResponseEntity<List<FriendDTO>> getBlockedUsers(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.getBlockedUsers(user.getId()));
    }

    @GetMapping("/status/{targetUserId}")
    public ResponseEntity<FriendshipStatusResponseDTO> getFriendshipStatus(
            @PathVariable Long targetUserId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(friendshipService.getFriendshipStatus(targetUserId, user.getId()));
    }
}
