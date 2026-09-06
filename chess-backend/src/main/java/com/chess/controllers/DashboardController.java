package com.chess.controllers;

import com.chess.dto.AuthResponse;
import com.chess.dto.RegisterRequest;
import com.chess.dto.request.DashboardSummaryDTO;
import com.chess.services.UserDashboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final UserDashboardService userDashboardService;

    @GetMapping("/{id}/summary")
    public ResponseEntity<DashboardSummaryDTO> summaryDashBoardInformation(@PathVariable Long id) {
        DashboardSummaryDTO dashboardSummaryDTO = userDashboardService.userDashboardSummary(id);
        return ResponseEntity.ok(dashboardSummaryDTO);
    }
}
