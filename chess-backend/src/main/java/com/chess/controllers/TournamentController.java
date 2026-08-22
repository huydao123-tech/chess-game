package com.chess.controllers;


import com.chess.dto.request.CreateTournamentRoomRequestDTO;
import com.chess.dto.response.CreateTournamentRoomResponseDTO;
import com.chess.models.Tournament;
import com.chess.services.TournamentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tournament")
@RequiredArgsConstructor
public class TournamentController {
    private final TournamentService tournamentService;

    @PostMapping
    public ResponseEntity<CreateTournamentRoomResponseDTO> createTournament(
            @Valid @RequestBody CreateTournamentRoomRequestDTO requestDto) {
        CreateTournamentRoomResponseDTO result = tournamentService.createRoom(requestDto);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/create")
    public ResponseEntity<CreateTournamentRoomResponseDTO> createTournamentRoom(
            @Valid @RequestBody CreateTournamentRoomRequestDTO requestDto) {
        CreateTournamentRoomResponseDTO result = tournamentService.createRoom(requestDto);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/finish")
    public ResponseEntity<CreateTournamentRoomResponseDTO> finishMatch(
            @Valid @RequestBody CreateTournamentRoomRequestDTO requestDto) {
        CreateTournamentRoomResponseDTO result = tournamentService.createRoom(requestDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<List<Tournament>> getAllTournaments() {
        List<Tournament> tournaments = tournamentService.getAllTournaments();
        return ResponseEntity.ok(tournaments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tournament> getTournamentById(@PathVariable Long id) {
        Tournament tournament = tournamentService.getTournamentById(id);
        return ResponseEntity.ok(tournament);
    }


}
