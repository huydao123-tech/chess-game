package com.chess.services;

import com.chess.dto.request.CreateTournamentRoomRequestDTO;
import com.chess.dto.response.CreateTournamentRoomResponseDTO;
import com.chess.enums.TournamentStatus;
import com.chess.models.Tournament;
import com.chess.repositories.TournamentRepository;
import com.chess.repositories.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TournamentService {
    private final UserRepository userRepository;
    private final TournamentRepository tournamentRepository;

    public TournamentService(UserRepository userRepository, TournamentRepository tournamentRepository) {
        this.userRepository = userRepository;
        this.tournamentRepository = tournamentRepository;
    }

    @Transactional
    public CreateTournamentRoomResponseDTO createRoom(CreateTournamentRoomRequestDTO request) {
        Tournament targetTournament;
        if (request.getId() != null) {
            targetTournament = tournamentRepository.findById(request.getId())
                    .orElseGet(() -> Tournament.builder()
                            .name(request.getName())
                            .status(TournamentStatus.DRAFT)
                            .startTime(request.getStartTime())
                            .endTime(request.getEndTime())
                            .timeControl(request.getTimeControl())
                            .build());
            targetTournament.createRoom(
                    request.getId(),
                    request.getName(),
                    request.getStartTime(),
                    request.getEndTime(),
                    request.getTimeControl()
            );
        } else {
            targetTournament = Tournament.builder()
                    .name(request.getName())
                    .status(TournamentStatus.DRAFT)
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .timeControl(request.getTimeControl())
                    .build();
        }

        Tournament saved = tournamentRepository.save(targetTournament);
        return CreateTournamentRoomResponseDTO.toEntity(saved);
    }

    public List<Tournament> getAllTournaments() {
        return tournamentRepository.findAll();
    }

    public Tournament getTournamentById(Long id) {
        return tournamentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giải đấu có id: " + id));
    }

    @Transactional
    public CreateTournamentRoomResponseDTO openToPublic(CreateTournamentRoomRequestDTO request){
        Tournament targetTournament = tournamentRepository.findById(request.getId())
                .orElseGet(() -> Tournament.builder()
                        .name(request.getName())
                        .status(TournamentStatus.REGISTRATION)
                        .startTime(request.getStartTime())
                        .endTime(request.getEndTime())
                        .timeControl(request.getTimeControl())
                        .build());
        targetTournament.openToPublic(request.getId(), request.getName(),TournamentStatus.REGISTRATION, request.getStartTime(), request.getEndTime(), request.getTimeControl());
        Tournament saved = tournamentRepository.save(targetTournament);
        return CreateTournamentRoomResponseDTO.toEntity(saved);
    }
}
