package com.chess.services;

import com.chess.dto.request.SendFriendRequest;
import com.chess.dto.response.FriendDTO;
import com.chess.dto.response.FriendRequestDTO;
import com.chess.dto.response.FriendshipStatusResponseDTO;
import com.chess.dto.response.SendFriendResponse;
import com.chess.enums.FriendshipStatus;
import com.chess.models.Friendship;
import com.chess.models.User;
import com.chess.repositories.FriendshipRepository;
import com.chess.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendshipService {
    
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserPresenceService userPresenceService;

    @Transactional
    public SendFriendResponse sendFriendRequest(Long senderId, Long receiverId, SendFriendRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Người gửi không hợp lệ"));
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Người nhận không hợp lệ"));

        if (senderId.equals(receiverId)) {
            throw new IllegalArgumentException("Không thể tự gửi kết bạn cho chính mình!");
        }

        Optional<Friendship> existingOpt = friendshipRepository.findFriendshipBetweenUsers(senderId, receiverId);
        
        if (existingOpt.isPresent()) {
            Friendship friendship = existingOpt.get();
            if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new IllegalStateException("Hai người đã là bạn bè!");
            }
            if (friendship.getStatus() == FriendshipStatus.PENDING) {
                if (friendship.getUser1().getId().equals(senderId)) {
                    throw new IllegalStateException("Lời mời kết bạn đã tồn tại và đang chờ phản hồi!");
                } else {
                    throw new IllegalStateException("Người dùng này đã gửi lời mời kết bạn cho bạn, hãy chấp nhận lời mời!");
                }
            }
            if (friendship.getStatus() == FriendshipStatus.BLOCKED_BY_USER1 || friendship.getStatus() == FriendshipStatus.BLOCKED_BY_USER2) {
                if (friendship.getStatus() == FriendshipStatus.BLOCKED_BY_USER1 && friendship.getUser1().getId().equals(senderId)) {
                    throw new IllegalStateException("Bạn đang chặn người dùng này! Hãy bỏ chặn trước khi gửi kết bạn.");
                } else if (friendship.getStatus() == FriendshipStatus.BLOCKED_BY_USER2 && friendship.getUser2().getId().equals(senderId)) {
                    throw new IllegalStateException("Bạn đang chặn người dùng này! Hãy bỏ chặn trước khi gửi kết bạn.");
                } else {
                    throw new IllegalStateException("Không thể gửi kết bạn do tài khoản đang bị chặn!");
                }
            }
            
            friendship.reopen(sender, receiver);
            return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
        }

        Friendship friendship = Friendship.createRequest(sender, receiver);
        return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
    }

    @Transactional
    public SendFriendResponse acceptFriendRequestByTargetUser(Long targetUserId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findFriendshipBetweenUsers(targetUserId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời kết bạn"));
        friendship.accept(currentUserId);
        return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
    }
    
    @Transactional
    public SendFriendResponse acceptFriendRequest(Long friendshipId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời kết bạn"));
        friendship.accept(currentUserId);
        return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
    }

    @Transactional
    public SendFriendResponse rejectFriendRequestByTargetUser(Long targetUserId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findFriendshipBetweenUsers(targetUserId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời kết bạn"));
        friendship.reject(currentUserId);
        return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
    }

    @Transactional
    public SendFriendResponse rejectFriendRequest(Long friendshipId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời kết bạn"));
        friendship.reject(currentUserId);
        return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
    }

    @Transactional
    public SendFriendResponse cancelFriendRequestByTargetUser(Long targetUserId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findFriendshipBetweenUsers(targetUserId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời kết bạn"));
        friendship.cancel(currentUserId);
        return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
    }

    @Transactional
    public SendFriendResponse cancelFriendRequest(Long friendshipId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lời mời kết bạn"));
        friendship.cancel(currentUserId);
        return SendFriendResponse.fromEntity(friendshipRepository.save(friendship));
    }

    @Transactional
    public void unfriend(Long targetUserId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findFriendshipBetweenUsers(targetUserId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mối quan hệ bạn bè"));
        friendship.unfriend(currentUserId);
        friendshipRepository.save(friendship);
    }

    @Transactional
    public void blockUser(Long targetUserId, Long currentUserId) {
        if (targetUserId.equals(currentUserId)) {
            throw new IllegalArgumentException("Không thể tự chặn chính mình!");
        }
        
        Optional<Friendship> existingOpt = friendshipRepository.findFriendshipBetweenUsers(targetUserId, currentUserId);
        Friendship friendship;
        if (existingOpt.isPresent()) {
            friendship = existingOpt.get();
            friendship.block(currentUserId);
        } else {
            User current = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Người dùng không hợp lệ"));
            User target = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Người dùng cần chặn không tồn tại"));
            friendship = Friendship.builder()
                    .user1(current)
                    .user2(target)
                    .status(FriendshipStatus.BLOCKED_BY_USER1)
                    .build();
        }
        friendshipRepository.save(friendship);
    }

    @Transactional
    public void unblockUser(Long targetUserId, Long currentUserId) {
        Friendship friendship = friendshipRepository.findFriendshipBetweenUsers(targetUserId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng trong danh sách chặn"));
        friendship.unblock(currentUserId);
        friendshipRepository.save(friendship);
    }

    public List<FriendDTO> getFriendsList(Long currentUserId) {
        return friendshipRepository.findAcceptedFriendshipsByUserId(currentUserId).stream()
                .map(f -> {
                    Long otherId = f.getUser1().getId().equals(currentUserId) ? f.getUser2().getId() : f.getUser1().getId();
                    boolean isOnline = userPresenceService.isUserOnline(otherId);
                    return FriendDTO.fromFriendship(f, currentUserId, isOnline);
                })
                .collect(Collectors.toList());
    }

    public List<FriendRequestDTO> getReceivedFriendRequests(Long currentUserId) {
        return friendshipRepository.findByUser2IdAndStatus(currentUserId, FriendshipStatus.PENDING).stream()
                .map(FriendRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<FriendRequestDTO> getSentFriendRequests(Long currentUserId) {
        return friendshipRepository.findByUser1IdAndStatus(currentUserId, FriendshipStatus.PENDING).stream()
                .map(FriendRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<FriendDTO> getBlockedUsers(Long currentUserId) {
        return friendshipRepository.findBlockedFriendshipsByUserId(currentUserId).stream()
                .map(f -> FriendDTO.fromFriendship(f, currentUserId))
                .filter(dto -> dto.getStatus() == FriendshipStatus.BLOCKED_BY_USER1 || dto.getStatus() == FriendshipStatus.BLOCKED_BY_USER2)
                .collect(Collectors.toList());
    }

    public FriendshipStatusResponseDTO getFriendshipStatus(Long targetUserId, Long currentUserId) {
        Optional<Friendship> opt = friendshipRepository.findFriendshipBetweenUsers(targetUserId, currentUserId);
        if (opt.isEmpty()) {
            return new FriendshipStatusResponseDTO(targetUserId, "NONE", null);
        }
        
        Friendship f = opt.get();
        String statusStr = "NONE";
        
        switch (f.getStatus()) {
            case ACCEPTED:
                statusStr = "FRIEND";
                break;
            case PENDING:
                if (f.getUser1().getId().equals(currentUserId)) {
                    statusStr = "PENDING_SENT";
                } else {
                    statusStr = "PENDING_RECEIVED";
                }
                break;
            case BLOCKED_BY_USER1:
                if (f.getUser1().getId().equals(currentUserId)) {
                    statusStr = "BLOCKED_BY_YOU";
                } else {
                    statusStr = "BLOCKED_BY_THEM";
                }
                break;
            case BLOCKED_BY_USER2:
                if (f.getUser2().getId().equals(currentUserId)) {
                    statusStr = "BLOCKED_BY_YOU";
                } else {
                    statusStr = "BLOCKED_BY_THEM";
                }
                break;
            case REJECTED:
            case CANCELLED:
                statusStr = "NONE";
                break;
            case BLOCKED:
                statusStr = "BLOCKED_BY_THEM";
                break;
        }
        
        return new FriendshipStatusResponseDTO(targetUserId, statusStr, f.getId());
    }
}
