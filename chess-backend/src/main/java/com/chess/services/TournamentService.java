package com.chess.services;

import com.chess.dto.request.CreateTournamentRoomRequestDTO;
import com.chess.dto.response.CreateTournamentRoomResponseDTO;
import com.chess.dto.response.ParticipantResponseDTO;
import com.chess.dto.response.TournamentDetailResponseDTO;
import com.chess.dto.response.TournamentMatchResponseDTO;
import com.chess.dto.response.TournamentResponseDTO;
import com.chess.enums.MatchStatus;
import com.chess.enums.TournamentFormat;
import com.chess.enums.TournamentStatus;
import com.chess.models.Tournament;
import com.chess.models.TournamentMatch;
import com.chess.models.TournamentParticipant;
import com.chess.models.User;
import com.chess.repositories.TournamentMatchRepository;
import com.chess.repositories.TournamentParticipantRepository;
import com.chess.repositories.TournamentRepository;
import com.chess.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TournamentService {
    private final UserRepository userRepository;
    private final TournamentRepository tournamentRepository;
    private final TournamentParticipantRepository participantRepository;
    private final TournamentMatchRepository matchRepository;

    public TournamentService(
            UserRepository userRepository,
            TournamentRepository tournamentRepository,
            TournamentParticipantRepository participantRepository,
            TournamentMatchRepository matchRepository) {
        this.userRepository = userRepository;
        this.tournamentRepository = tournamentRepository;
        this.participantRepository = participantRepository;
        this.matchRepository = matchRepository;
    }

    // ==========================================
    // STATE TRANSITION METHODS
    // ==========================================

    /**
     * 1. Khởi tạo giải đấu (Trạng thái: DRAFT)
     */
    @Transactional
    public TournamentResponseDTO createTournament(CreateTournamentRoomRequestDTO request, User creator) {
        int maxParticipants = (request.getMaxParticipants() != null && request.getMaxParticipants() >= 2)
                ? request.getMaxParticipants() : 8;
        int minParticipants = (request.getMinParticipants() != null && request.getMinParticipants() >= 2)
                ? request.getMinParticipants() : 4;
        TournamentFormat format = (request.getFormat() != null)
                ? request.getFormat() : TournamentFormat.SINGLE_ELIMINATION;

        Tournament tournament = Tournament.builder()
                .name(request.getName())
                .status(TournamentStatus.DRAFT)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .timeControl(request.getTimeControl())
                .maxParticipants(maxParticipants)
                .minParticipants(minParticipants)
                .format(format)
                .currentRound(0)
                .createdBy(creator)
                .build();

        Tournament saved = tournamentRepository.save(tournament);
        return TournamentResponseDTO.fromEntity(saved);
    }

    /**
     * 2. Chuyển State: DRAFT -> REGISTRATION (Mở đăng ký công khai)
     */
    @Transactional
    public TournamentResponseDTO openRegistration(Long id) {
        Tournament tournament = tournamentRepository.findByIdWithLock(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + id));
        tournament.openRegistration();
        Tournament saved = tournamentRepository.save(tournament);
        return TournamentResponseDTO.fromEntity(saved);
    }

    /**
     * 3. Kỳ thủ tham gia giải đấu
     * State: REGISTRATION -> FULL (nếu đủ người)
     */
    @Transactional
    public TournamentResponseDTO joinTournament(Long tournamentId, User user) {
        Tournament tournament = tournamentRepository.findByIdWithLock(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + tournamentId));

        if (tournament.getStatus() != TournamentStatus.REGISTRATION) {
            throw new IllegalStateException("Giải đấu hiện không ở trạng thái mở đăng ký (Hiện tại: " + tournament.getStatus() + ")");
        }

        if (participantRepository.existsByTournamentAndUser(tournament, user)) {
            throw new IllegalStateException("Bạn đã đăng ký tham gia giải đấu này rồi!");
        }

        List<TournamentParticipant> currentParticipants = participantRepository.findByTournament(tournament);
        if (currentParticipants.size() >= tournament.getMaxParticipants()) {
            tournament.setStatus(TournamentStatus.FULL);
            tournamentRepository.save(tournament);
            throw new IllegalStateException("Giải đấu đã đủ số lượng kỳ thủ tối đa (" + tournament.getMaxParticipants() + " người)!");
        }

        TournamentParticipant participant = TournamentParticipant.builder()
                .tournament(tournament)
                .user(user)
                .score(0.0)
                .seed(currentParticipants.size() + 1)
                .joinedAt(LocalDateTime.now())
                .build();
        participantRepository.save(participant);

        if (currentParticipants.size() + 1 >= tournament.getMaxParticipants()) {
            tournament.setStatus(TournamentStatus.FULL);
        }

        Tournament saved = tournamentRepository.save(tournament);
        return TournamentResponseDTO.fromEntity(saved);
    }

    /**
     * 4. Rút lui khỏi giải đấu
     * State: FULL -> REGISTRATION nếu trước đó đang FULL
     */
    @Transactional
    public TournamentResponseDTO leaveTournament(Long tournamentId, User user) {
        Tournament tournament = tournamentRepository.findByIdWithLock(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + tournamentId));

        if (tournament.getStatus() != TournamentStatus.REGISTRATION && tournament.getStatus() != TournamentStatus.FULL) {
            throw new IllegalStateException("Không thể rút lui khi giải đấu đã sẵn sàng hoặc đang diễn ra!");
        }

        TournamentParticipant participant = participantRepository.findByTournamentAndUser(tournament, user)
                .orElseThrow(() -> new IllegalArgumentException("Bạn chưa đăng ký tham gia giải đấu này!"));

        participantRepository.delete(participant);

        if (tournament.getStatus() == TournamentStatus.FULL) {
            tournament.setStatus(TournamentStatus.REGISTRATION);
        }

        Tournament saved = tournamentRepository.save(tournament);
        return TournamentResponseDTO.fromEntity(saved);
    }

    /**
     * 5. Chốt danh sách, sẵn sàng bắt đầu
     * State: REGISTRATION/FULL -> READY
     */
    @Transactional
    public TournamentResponseDTO readyToStartTournament(Long tournamentId) {
        Tournament tournament = tournamentRepository.findByIdWithLock(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + tournamentId));
        tournament.readyToStart();
        Tournament saved = tournamentRepository.save(tournament);
        return TournamentResponseDTO.fromEntity(saved);
    }

    /**
     * 6. Bắt đầu giải đấu – sinh bracket Single Elimination
     * State: READY -> ONGOING
     */
    @Transactional
    public TournamentDetailResponseDTO startTournament(Long tournamentId) {
        Tournament tournament = tournamentRepository.findByIdWithLock(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + tournamentId));

        tournament.startTournament(); // validates state + sets ONGOING, currentRound = 1
        Tournament saved = tournamentRepository.save(tournament);

        List<TournamentParticipant> participants = participantRepository.findByTournament(saved);

        if (saved.getFormat() == TournamentFormat.SINGLE_ELIMINATION) {
            generateSingleEliminationBracket(saved, participants);
        }
        // ROUND_ROBIN and SWISS: reserved for future implementation

        return TournamentDetailResponseDTO.fromEntity(
                tournamentRepository.findByIdWithLock(tournamentId).orElseThrow()
        );
    }

    /**
     * Sinh cây đấu Single Elimination.
     * Nếu số người không phải lũy thừa 2, những slot thừa sẽ là BYE (thắng tự động).
     */
    private void generateSingleEliminationBracket(Tournament tournament, List<TournamentParticipant> participants) {
        // Xóa bracket cũ nếu có
        List<TournamentMatch> existing = matchRepository.findByTournament(tournament);
        if (!existing.isEmpty()) {
            matchRepository.deleteAll(existing);
        }

        // Trộn ngẫu nhiên để tạo cặp đấu
        List<User> players = new ArrayList<>(participants.stream().map(TournamentParticipant::getUser).collect(Collectors.toList()));
        Collections.shuffle(players);

        // Tính số vòng và số slot (lũy thừa 2 gần nhất >= số người)
        int n = players.size();
        int totalSlots = 1;
        while (totalSlots < n) totalSlots <<= 1;
        int totalRounds = Integer.numberOfTrailingZeros(totalSlots);

        // Tạo tất cả các trận đấu trống cho toàn cây (từ vòng cuối về vòng 1)
        // Tổng số trận = totalSlots - 1
        List<TournamentMatch> allMatches = new ArrayList<>();

        // Tạo trận từ vòng 1 đến vòng chung kết
        // Mỗi vòng r có (totalSlots >> r) trận
        // Vòng 1: totalSlots/2 trận, vòng 2: totalSlots/4 trận, ...
        for (int round = 1; round <= totalRounds; round++) {
            int matchesInRound = totalSlots >> round;
            for (int order = 1; order <= matchesInRound; order++) {
                TournamentMatch match = TournamentMatch.builder()
                        .tournament(tournament)
                        .roundNumber(round)
                        .matchOrder(order)
                        .status(MatchStatus.SCHEDULED)
                        .build();
                allMatches.add(match);
            }
        }

        // Lưu tất cả để lấy ID
        allMatches = matchRepository.saveAll(allMatches);

        // Gán nextMatchId cho mỗi trận: trận ở vòng r, order o -> vòng r+1, order ceil(o/2)
        // Build index map: (roundNumber, matchOrder) -> TournamentMatch
        var matchIndex = new java.util.HashMap<String, TournamentMatch>();
        for (TournamentMatch m : allMatches) {
            matchIndex.put(m.getRoundNumber() + "_" + m.getMatchOrder(), m);
        }

        List<TournamentMatch> toUpdate = new ArrayList<>();
        for (TournamentMatch m : allMatches) {
            if (m.getRoundNumber() < totalRounds) {
                int nextOrder = (int) Math.ceil(m.getMatchOrder() / 2.0);
                TournamentMatch nextMatch = matchIndex.get((m.getRoundNumber() + 1) + "_" + nextOrder);
                if (nextMatch != null) {
                    m.setNextMatchId(nextMatch.getId());
                    toUpdate.add(m);
                }
            }
        }
        matchRepository.saveAll(toUpdate);

        // Gán kỳ thủ vào vòng 1
        List<TournamentMatch> round1Matches = allMatches.stream()
                .filter(m -> m.getRoundNumber() == 1)
                .sorted(java.util.Comparator.comparingInt(TournamentMatch::getMatchOrder))
                .collect(Collectors.toList());

        List<TournamentMatch> assignedMatches = new ArrayList<>();
        for (int i = 0; i < round1Matches.size(); i++) {
            TournamentMatch match = round1Matches.get(i);
            int p1Idx = i * 2;
            int p2Idx = i * 2 + 1;

            User white = p1Idx < players.size() ? players.get(p1Idx) : null;
            User black = p2Idx < players.size() ? players.get(p2Idx) : null;

            match.setWhitePlayer(white);
            match.setBlackPlayer(black);

            // BYE: chỉ có 1 người -> tự động thắng
            if (white != null && black == null) {
                match.setWinner(white);
                match.setStatus(MatchStatus.BYE);
            } else if (white != null) {
                match.setStatus(MatchStatus.SCHEDULED);
            }

            assignedMatches.add(match);
        }
        matchRepository.saveAll(assignedMatches);
    }

    /**
     * 7. Hủy giải đấu
     */
    @Transactional
    public TournamentResponseDTO cancelTournament(Long tournamentId) {
        Tournament tournament = tournamentRepository.findByIdWithLock(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + tournamentId));

        if (tournament.getStatus() == TournamentStatus.CANCELLED) {
            throw new IllegalStateException("Giải đấu đã bị hủy trước đó!");
        }

        tournament.setStatus(TournamentStatus.CANCELLED);
        Tournament saved = tournamentRepository.save(tournament);
        return TournamentResponseDTO.fromEntity(saved);
    }

    // ==========================================
    // QUERY METHODS
    // ==========================================

    public List<TournamentResponseDTO> getAllTournaments() {
        return tournamentRepository.findAll().stream()
                .map(TournamentResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public TournamentResponseDTO getTournamentById(Long id) {
        Tournament tournament = tournamentRepository.findByIdWithLock(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + id));
        return TournamentResponseDTO.fromEntity(tournament);
    }

    public TournamentDetailResponseDTO getTournamentDetail(Long id) {
        Tournament tournament = tournamentRepository.findByIdWithLock(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + id));
        return TournamentDetailResponseDTO.fromEntity(tournament);
    }

    public List<ParticipantResponseDTO> getParticipants(Long tournamentId) {
        Tournament tournament = tournamentRepository.findByIdWithLock(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + tournamentId));
        return participantRepository.findByTournament(tournament).stream()
                .map(ParticipantResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<TournamentMatchResponseDTO> getBracket(Long tournamentId) {
        return matchRepository.findByTournamentIdOrderByRoundNumberAscMatchOrderAsc(tournamentId)
                .stream()
                .map(TournamentMatchResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public Tournament getTournamentEntityById(Long id) {
        return tournamentRepository.findByIdWithLock(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + id));
    }

    // ==========================================
    // BACKWARD COMPATIBILITY & SETTINGS
    // ==========================================

    @Transactional
    public CreateTournamentRoomResponseDTO createRoom(CreateTournamentRoomRequestDTO request) {
        int maxParticipants = (request.getMaxParticipants() != null && request.getMaxParticipants() >= 2)
                ? request.getMaxParticipants() : 8;
        int minParticipants = (request.getMinParticipants() != null && request.getMinParticipants() >= 2)
                ? request.getMinParticipants() : 4;
        TournamentFormat format = (request.getFormat() != null)
                ? request.getFormat() : TournamentFormat.SINGLE_ELIMINATION;

        Tournament targetTournament;
        if (request.getId() != null) {
            targetTournament = tournamentRepository.findByIdWithLock(request.getId())
                    .orElseGet(() -> Tournament.builder()
                            .name(request.getName())
                            .status(TournamentStatus.DRAFT)
                            .startTime(request.getStartTime())
                            .endTime(request.getEndTime())
                            .timeControl(request.getTimeControl())
                            .maxParticipants(maxParticipants)
                            .minParticipants(minParticipants)
                            .format(format)
                            .build());
            targetTournament.createRoom(
                    request.getId(),
                    request.getName(),
                    request.getStartTime(),
                    request.getEndTime(),
                    request.getTimeControl()
            );
            targetTournament.setMaxParticipants(maxParticipants);
            targetTournament.setMinParticipants(minParticipants);
            targetTournament.setFormat(format);
        } else {
            targetTournament = Tournament.builder()
                    .name(request.getName())
                    .status(TournamentStatus.DRAFT)
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .timeControl(request.getTimeControl())
                    .maxParticipants(maxParticipants)
                    .minParticipants(minParticipants)
                    .format(format)
                    .build();
        }

        Tournament saved = tournamentRepository.save(targetTournament);
        return CreateTournamentRoomResponseDTO.toEntity(saved);
    }

    @Transactional
    public CreateTournamentRoomResponseDTO openToPublic(CreateTournamentRoomRequestDTO request) {
        Long targetId = request.getId();
        if (targetId == null) {
            throw new IllegalArgumentException("ID giải đấu không được để trống khi mở công khai.");
        }
        TournamentResponseDTO result = openRegistration(targetId);
        Tournament entity = tournamentRepository.findByIdWithLock(result.getId()).orElseThrow();
        return CreateTournamentRoomResponseDTO.toEntity(entity);
    }

    @Transactional
    public TournamentResponseDTO changeTournamentSetting(Long tournamentId, CreateTournamentRoomRequestDTO request) {
        Tournament tournament = tournamentRepository.findByIdWithLock(tournamentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có ID: " + tournamentId));

        if (request.getName() != null) tournament.setName(request.getName());
        if (request.getStartTime() != null) tournament.setStartTime(request.getStartTime());
        if (request.getEndTime() != null) tournament.setEndTime(request.getEndTime());
        if (request.getTimeControl() > 0) tournament.setTimeControl(request.getTimeControl());
        if (request.getMaxParticipants() != null && request.getMaxParticipants() >= 2)
            tournament.setMaxParticipants(request.getMaxParticipants());
        if (request.getMinParticipants() != null && request.getMinParticipants() >= 2)
            tournament.setMinParticipants(request.getMinParticipants());
        if (request.getFormat() != null) tournament.setFormat(request.getFormat());

        Tournament saved = tournamentRepository.save(tournament);
        return TournamentResponseDTO.fromEntity(saved);
    }
}
