package com.chess.controllers;

import com.chess.dto.request.CreateTournamentRoomRequestDTO;
import com.chess.dto.response.CreateTournamentRoomResponseDTO;
import com.chess.dto.response.ParticipantResponseDTO;
import com.chess.dto.response.TournamentDetailResponseDTO;
import com.chess.dto.response.TournamentMatchResponseDTO;
import com.chess.dto.response.TournamentResponseDTO;
import com.chess.models.User;
import com.chess.repositories.UserRepository;
import com.chess.services.TournamentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournament")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;
    private final UserRepository userRepository;

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null) return null;
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    private User requireCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản"));
    }

    // ==========================================
    // STATE TRANSITION ENDPOINTS
    // ==========================================

    /**
     * 1. Khởi tạo giải đấu mới (Trạng thái DRAFT)
     * POST /api/tournament
     */
    @PostMapping
    public ResponseEntity<TournamentResponseDTO> createTournament(
            @Valid @RequestBody CreateTournamentRoomRequestDTO requestDto,
            Authentication authentication) {
        User creator = getCurrentUser(authentication);
        return ResponseEntity.ok(tournamentService.createTournament(requestDto, creator));
    }

    /**
     * 2. Chuyển State: DRAFT -> REGISTRATION (Mở đăng ký)
     * POST /api/tournament/{id}/open
     */
    @PostMapping("/{id}/open")
    public ResponseEntity<TournamentResponseDTO> openRegistration(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.openRegistration(id));
    }

    /**
     * 3. Tham gia giải đấu (REGISTRATION -> FULL nếu đủ người)
     * POST /api/tournament/{id}/join
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<TournamentResponseDTO> joinTournament(
            @PathVariable Long id, Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);
        return ResponseEntity.ok(tournamentService.joinTournament(id, currentUser));
    }

    /**
     * 4. Rút lui khỏi giải đấu
     * POST /api/tournament/{id}/leave
     */
    @PostMapping("/{id}/leave")
    public ResponseEntity<TournamentResponseDTO> leaveTournament(
            @PathVariable Long id, Authentication authentication) {
        User currentUser = requireCurrentUser(authentication);
        return ResponseEntity.ok(tournamentService.leaveTournament(id, currentUser));
    }

    /**
     * 5. Chốt danh sách, sẵn sàng bắt đầu (REGISTRATION/FULL -> READY)
     * POST /api/tournament/{id}/ready
     */
    @PostMapping("/{id}/ready")
    public ResponseEntity<TournamentResponseDTO> readyToStart(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.readyToStartTournament(id));
    }

    /**
     * 6. Bắt đầu giải đấu + sinh bracket (READY -> ONGOING)
     * POST /api/tournament/{id}/start
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<TournamentDetailResponseDTO> startTournament(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.startTournament(id));
    }

    /**
     * 7. Hủy giải đấu
     * POST /api/tournament/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<TournamentResponseDTO> cancelTournament(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.cancelTournament(id));
    }

    // ==========================================
    // QUERY ENDPOINTS
    // ==========================================

    /**
     * Lấy danh sách tất cả giải đấu (dùng cho trang list)
     * GET /api/tournament
     */
    @GetMapping
    public ResponseEntity<List<TournamentResponseDTO>> getAllTournaments() {
        return ResponseEntity.ok(tournamentService.getAllTournaments());
    }

    /**
     * Lấy thông tin cơ bản 1 giải đấu
     * GET /api/tournament/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<TournamentResponseDTO> getTournamentById(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.getTournamentById(id));
    }

    /**
     * Lấy thông tin chi tiết giải đấu kèm danh sách kỳ thủ
     * GET /api/tournament/{id}/detail
     */
    @GetMapping("/{id}/detail")
    public ResponseEntity<TournamentDetailResponseDTO> getTournamentDetail(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.getTournamentDetail(id));
    }

    /**
     * Lấy danh sách kỳ thủ tham gia
     * GET /api/tournament/{id}/participants
     */
    @GetMapping("/{id}/participants")
    public ResponseEntity<List<ParticipantResponseDTO>> getParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.getParticipants(id));
    }

    /**
     * Lấy bracket (cây đấu) của giải
     * GET /api/tournament/{id}/bracket
     */
    @GetMapping("/{id}/bracket")
    public ResponseEntity<List<TournamentMatchResponseDTO>> getBracket(@PathVariable Long id) {
        return ResponseEntity.ok(tournamentService.getBracket(id));
    }

    // ==========================================
    // BACKWARD COMPATIBILITY ENDPOINTS
    // ==========================================

    @PostMapping("/create")
    public ResponseEntity<CreateTournamentRoomResponseDTO> createTournamentRoom(
            @Valid @RequestBody CreateTournamentRoomRequestDTO requestDto) {
        return ResponseEntity.ok(tournamentService.createRoom(requestDto));
    }

    @PostMapping("/open")
    public ResponseEntity<CreateTournamentRoomResponseDTO> openToPublicLegacy(
            @Valid @RequestBody CreateTournamentRoomRequestDTO requestDto) {
        return ResponseEntity.ok(tournamentService.openToPublic(requestDto));
    }
}
