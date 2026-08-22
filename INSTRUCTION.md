// MatchStatus.java
package com.chess.game.enums;

public enum MatchStatus {
    PLAYING,
    FINISHED,
    CANCELLED
}

// FinishReason.java
package com.chess.game.enums;

public enum FinishReason {
    CHECKMATE,
    RESIGNATION,
    TIMEOUT,
    DRAW_AGREED
}

# CHUẨN CODE KHÔNG DÙNG APIRESPONSE WRAPPER
> **Ghi chú:** Trả về trực tiếp Entity/DTO (`ResponseEntity<MatchResultResponseDTO>`) giúp bớt 1 tầng bọc dữ liệu (Wrapper layer), làm nhẹ Payload JSON và code phẳng hơn.

---

## 1. DTO (DATA TRANSFER OBJECTS)

### 📄 `FinishMatchRequestDTO.java` (Dữ liệu vào từ Frontend)
```java
package com.chess.game.dto;

import com.chess.game.enums.FinishReason;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO hứng thông tin khi có yêu cầu kết thúc ván cờ gửi lên từ Frontend.
 */
public class FinishMatchRequestDTO {

    /**
     * ID duy nhất của ván cờ cần kết thúc.
     * Bắt buộc phải có để DB và Lock biết đang thao tác trên trận nào.
     */
    @NotNull(message = "Match ID không được để trống")
    private Long matchId;

    /**
     * ID của người thắng trận (Ví dụ: 101, 102).
     * Truyền 0L nếu trận đấu có kết quả HÒA.
     */
    @NotNull(message = "Winner ID không được để trống")
    private Long winnerId;

    /**
     * Lý do trận đấu kết thúc (CHECKMATE: Chiếu bí, RESIGNATION: Đầu hàng, TIMEOUT: Hết giờ...).
     * Dùng Enum để đảm bảo không bị truyền chuỗi lung tung.
     */
    @NotNull(message = "Lý do kết thúc không được để trống")
    private FinishReason reason;

    // --- GETTERS & SETTERS (Cho phép Spring Boot Deserialize chuỗi JSON gửi lên thành Java Object) ---

    public Long getMatchId() { 
        return matchId; 
    }
    public void setMatchId(Long matchId) { 
        this.matchId = matchId; 
    }

    public Long getWinnerId() { 
        return winnerId; 
    }
    public void setWinnerId(Long winnerId) { 
        this.winnerId = winnerId; 
    }

    public FinishReason getReason() { 
        return reason; 
    }
    public void setReason(FinishReason reason) { 
        this.reason = reason; 
    }
}

package com.chess.game.dto;

import com.chess.game.entity.Match;
import com.chess.game.entity.Player;

/**
 * Response DTO đóng gói toàn bộ thông tin kết quả trận đấu và biến động ELO.
 * Dữ liệu này sẽ trả trực tiếp cho Client và Broadcast qua WebSocket.
 */
public class MatchResultResponseDTO {

    private Long matchId;         // ID ván cờ
    private String status;        // Trạng thái mới (Nên là FINISHED)
    private Long winnerId;        // ID người thắng (hoặc 0)
    private String reason;        // Lý do kết thúc (RESIGNATION, TIMEOUT...)
    private PlayerEloChange whitePlayer; // Chi tiết biến động ELO của người cầm quân Trắng
    private PlayerEloChange blackPlayer; // Chi tiết biến động ELO của người cầm quân Đen

    /**
     * Class con đóng gói thông số thay đổi ELO cho từng người chơi.
     */
    public static class PlayerEloChange {
        private Long playerId;   // ID kỳ thủ
        private String username; // Tên hiển thị
        private int oldElo;      // ELO trước khi đánh
        private int newElo;      // ELO mới sau khi tính toán
        private int eloDiff;     // Số ELO tăng/giảm (VD: +16 hoặc -16)

        public PlayerEloChange(Long playerId, String username, int oldElo, int newElo) {
            this.playerId = playerId;
            this.username = username;
            this.oldElo = oldElo;
            this.newElo = newElo;
            this.eloDiff = newElo - oldElo; // Tự tính khoảng chênh lệch
        }

        public Long getPlayerId() { return playerId; }
        public String getUsername() { return username; }
        public int getOldElo() { return oldElo; }
        public int getNewElo() { return newElo; }
        public int getEloDiff() { return eloDiff; }
    }

    /**
     * Hàm tĩnh (Static Factory Method) giúp chuyển đổi (Map) dữ liệu từ Entity sang DTO.
     * Chỉ nhặt các dữ liệu cần thiết để hiển thị trên UI.
     * 
     * @param match Entity Match sau khi đã được cập nhật trạng thái kết thúc.
     * @param white Entity Player Trắng (chứa ELO mới).
     * @param black Entity Player Đen (chứa ELO mới).
     * @param oldWhiteElo ELO ban đầu của Trắng trước khi tính.
     * @param oldBlackElo ELO ban đầu của Đen trước khi tính.
     */
    public static MatchResultResponseDTO create(Match match, Player white, Player black, int oldWhiteElo, int oldBlackElo) {
        MatchResultResponseDTO dto = new MatchResultResponseDTO();
        dto.matchId = match.getId();
        dto.status = match.getStatus().name();
        dto.winnerId = match.getWinnerId();
        dto.reason = match.getFinishReason().name();
        
        // Đóng gói thông tin biến động ELO của từng kỳ thủ
        dto.whitePlayer = new PlayerEloChange(white.getId(), white.getUsername(), oldWhiteElo, white.getElo());
        dto.blackPlayer = new PlayerEloChange(black.getId(), black.getUsername(), oldBlackElo, black.getElo());
        
        return dto;
    }

    // --- GETTERS (Cần thiết để Spring Jackson Serializer biến Object này thành JSON) ---
    public Long getMatchId() { return matchId; }
    public String getStatus() { return status; }
    public Long getWinnerId() { return winnerId; }
    public String getReason() { return reason; }
    public PlayerEloChange getWhitePlayer() { return whitePlayer; }
    public PlayerEloChange getBlackPlayer() { return blackPlayer; }
}

package com.chess.game.entity;

import com.chess.game.enums.FinishReason;
import com.chess.game.enums.MatchStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity đại diện cho bảng 'matches' trong Database.
 * Nơi DUY NHẤT chứa luật bảo vệ State (State Guard) của ván cờ.
 */
@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Primary Key

    @Column(nullable = false)
    private Long whitePlayerId; // ID kỳ thủ cầm quân Trắng

    @Column(nullable = false)
    private Long blackPlayerId; // ID kỳ thủ cầm quân Đen

    private Long winnerId; // ID người thắng (Default null hoặc 0)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status; // Trạng thái hiện tại: PLAYING, FINISHED, CANCELLED

    @Enumerated(EnumType.STRING)
    private FinishReason finishReason; // Lý do kết thúc

    private LocalDateTime endedAt; // Thời điểm chốt kết thúc trận

    /**
     * HÀM XỬ LÝ STATE LOGIC (BUSINESS METHOD)
     * Thay đổi trạng thái ván cờ từ PLAYING -> FINISHED.
     *
     * @param winnerId ID người thắng được yêu cầu thiết lập.
     * @param reason Lý do ván cờ kết thúc.
     */
    public void finishGame(Long winnerId, FinishReason reason) {
        // 1. Guard Clause (Lớp bảo vệ State): Nếu ván cờ đã FINISHED hoặc CANCELLED từ trước thì CHẶN NGAY.
        if (this.status != MatchStatus.PLAYING) {
            throw new IllegalStateException("Ván cờ này đã kết thúc hoặc hủy bỏ trước đó, không thể kết thúc lại!");
        }

        // 2. Validate dữ liệu đầu vào: Người thắng phải là Trắng, Đen hoặc bằng 0 (Hòa).
        if (!winnerId.equals(0L) && !winnerId.equals(whitePlayerId) && !winnerId.equals(blackPlayerId)) {
            throw new IllegalArgumentException("Winner ID không trùng khớp với bất kỳ ai trong trận đấu này!");
        }

        // 3. THỰC HIỆN ĐỔI STATE TRONG DOMAIN
        this.winnerId = winnerId;
        this.finishReason = reason;
        this.status = MatchStatus.FINISHED; // Chuyển State thành FINISHED
        this.endedAt = LocalDateTime.now(); // Ghi nhận thời gian
    }

    // --- GETTERS ---
    public Long getId() { return id; }
    public Long getWhitePlayerId() { return whitePlayerId; }
    public Long getBlackPlayerId() { return blackPlayerId; }
    public Long getWinnerId() { return winnerId; }
    public MatchStatus getStatus() { return status; }
    public FinishReason getFinishReason() { return finishReason; }
}

package com.chess.game.service;

import com.chess.game.dto.FinishMatchRequestDTO;
import com.chess.game.dto.MatchResultResponseDTO;
import com.chess.game.entity.Match;
import com.chess.game.entity.Player;
import com.chess.game.repository.MatchRepository;
import com.chess.game.repository.PlayerRepository;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

@Service
public class MatchService {

    private final MatchRepository matchRepo;        // CRUD DB cho bảng matches
    private final PlayerRepository playerRepo;      // CRUD DB cho bảng players
    private final RedissonClient redissonClient;    // Dùng để tạo Distributed Lock chống tranh chấp (Concurrency)
    private final SimpMessagingTemplate messagingTemplate; // Dùng để đẩy dữ liệu Realtime sang WebSocket

    public MatchService(MatchRepository matchRepo, 
                        PlayerRepository playerRepo, 
                        RedissonClient redissonClient, 
                        SimpMessagingTemplate messagingTemplate) {
        this.matchRepo = matchRepo;
        this.playerRepo = playerRepo;
        this.redissonClient = redissonClient;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Luồng chính xử lý kết thúc trận đấu (Luồng 3S đầy đủ).
     * Bọc @Transactional để tự động Rollback DB nếu bất kỳ dòng code nào bên trong tung Exception.
     */
    @Transactional
    public MatchResultResponseDTO finishMatch(FinishMatchRequestDTO request) {

        // ------------------------------------------------------------------------
        // BƯỚC 1: SAFETY (CONCURRENCY LOCK)
        // Đặt một chiếc "Khóa" theo ID ván cờ để ngăn trường hợp cả 2 bên cùng gửi request 
        // kết thúc ván cờ tại cùng một thời điểm (VD: 1 bên Timeout, 1 bên Resign).
        // ------------------------------------------------------------------------
        String lockKey = "lock:match:" + request.getMatchId();
        RLock lock = redissonClient.getLock(lockKey);

        try {
            // Chờ tối đa 2 giây để lấy lock, nếu lấy được lock thì giữ lock tối đa 5 giây rồi tự nhả.
            boolean isLocked = lock.tryLock(2, 5, TimeUnit.SECONDS);
            if (!isLocked) {
                throw new IllegalStateException("Hệ thống đang xử lý kết quả trận đấu này ở thread khác, vui lòng chờ!");
            }

            // ------------------------------------------------------------------------
            // BƯỚC 2: FETCH DATA
            // Lấy thông tin Match và 2 Players tương ứng ra khỏi Database.
            // ------------------------------------------------------------------------
            Match match = matchRepo.findById(request.getMatchId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy trận đấu có ID: " + request.getMatchId()));

            Player whitePlayer = playerRepo.findById(match.getWhitePlayerId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kỳ thủ Trắng!"));
            Player blackPlayer = playerRepo.findById(match.getBlackPlayerId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kỳ thủ Đen!"));

            // Lưu lại ELO cũ của 2 bên trước khi cập nhật để vẽ DTO cho UI xem biến động (+/- ELO)
            int oldWhiteElo = whitePlayer.getElo();
            int oldBlackElo = blackPlayer.getElo();

            // ------------------------------------------------------------------------
            // BƯỚC 3: EXECUTE (ĐỔI STATE TRONG ENTITY & TÍNH ELO)
            // ------------------------------------------------------------------------
            // Gọi hàm trong Entity để thực hiện chuyển trạng thái sang FINISHED (Có check Guard Clause)
            match.finishGame(request.getWinnerId(), request.getReason());

            // Chạy thuật toán tính toán ELO mới và set trực tiếp ELO mới vào Object Player
            calculateAndApplyElo(whitePlayer, blackPlayer, request.getWinnerId());

            // ------------------------------------------------------------------------
            // BƯỚC 4: SAVE DB & MAP DTO
            // ------------------------------------------------------------------------
            matchRepo.save(match);
            playerRepo.save(whitePlayer);
            playerRepo.save(blackPlayer);

            // Chuyển đổi dữ liệu đã xử lý xong thành DTO
            MatchResultResponseDTO resultDTO = MatchResultResponseDTO.create(
                    match, whitePlayer, blackPlayer, oldWhiteElo, oldBlackElo
            );

            // ------------------------------------------------------------------------
            // BƯỚC 5: NOTIFY REALTIME (WEBSOCKET BROADCAST)
            // Bắn trực tiếp DTO kết quả tới topic WebSocket `/topic/match/{id}`.
            // Cả 2 Client (Trắng & Đen) đang subscribe topic này sẽ nhận được JSON ngay lập tức.
            // ------------------------------------------------------------------------
            messagingTemplate.convertAndSend("/topic/match/" + match.getId(), resultDTO);

            // Trả DTO về cho Controller
            return resultDTO;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Lỗi ngắt Thread khi đang xử lý Lock", e);
        } finally {
            // Luôn nhả Lock ở cuối block catch/try để tránh Deadlock nếu có lỗi xảy ra
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * Hàm phụ trợ tính điểm ELO mới dựa theo công thức Elo Chuẩn (K-Factor = 32).
     *
     * @param white Entity Player Trắng.
     * @param black Entity Player Đen.
     * @param winnerId ID người thắng (0L nếu hòa).
     */
    private void calculateAndApplyElo(Player white, Player black, Long winnerId) {
        int K = 32; // Tốc độ biến động điểm ELO (Chuẩn FIDE cho kỳ thủ thường)
        
        // Tính tỷ lệ thắng kỳ vọng (Expected Score) dựa trên chênh lệch điểm hiện tại
        double expectedWhite = 1.0 / (1.0 + Math.pow(10, (black.getElo() - white.getElo()) / 400.0));
        double expectedBlack = 1.0 - expectedWhite;

        // Xác định kết quả thực tế (Actual Score: Thắng = 1.0, Hòa = 0.5, Thua = 0.0)
        double actualWhite = winnerId.equals(white.getId()) ? 1.0 : (winnerId.equals(0L) ? 0.5 : 0.0);
        double actualBlack = 1.0 - actualWhite;

        // Cập nhật lại thuộc tính ELO trực tiếp trong Entity
        white.setElo((int) Math.round(white.getElo() + K * (actualWhite - expectedWhite)));
        black.setElo((int) Math.round(black.getElo() + K * (actualBlack - expectedBlack)));
    }
}

package com.chess.game.controller;

import com.chess.game.dto.FinishMatchRequestDTO;
import com.chess.game.dto.MatchResultResponseDTO;
import com.chess.game.service.MatchService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller tiếp nhận các HTTP Request liên quan đến trận đấu.
 * Đã BỎ hoàn toàn ApiResponse Wrapper, trả về trực tiếp ResponseEntity<MatchResultResponseDTO>.
 */
@RestController
@RequestMapping("/api/v1/matches")
public class MatchController {

    private final MatchService matchService;

    // Inject Service vào Controller thông qua Constructor Injection
    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    /**
     * Endpoint tiếp nhận yêu cầu kết thúc trận đấu.
     * URL: POST http://localhost:8080/api/v1/matches/finish
     * 
     * @param requestDto Object chứa dữ liệu gửi lên từ Body Request. 
     *                   @Valid kích hoạt kiểm tra các ràng buộc @NotNull trong DTO.
     * @return Trả về trực tiếp DTO kết quả kèm HTTP Status 200 OK.
     */
    @PostMapping("/finish")
    public ResponseEntity<MatchResultResponseDTO> finishMatch(
            @Valid @RequestBody FinishMatchRequestDTO requestDto) {

        // 1. Chuyển giao việc cho Service xử lý
        MatchResultResponseDTO result = matchService.finishMatch(requestDto);

        // 2. Trả trực tiếp DTO về cho Client với HTTP Status Code 200 (OK)
        // Spring Boot sẽ tự động biến Object MatchResultResponseDTO này thành chuỗi JSON thuần.
        return ResponseEntity.ok(result);
    }
}