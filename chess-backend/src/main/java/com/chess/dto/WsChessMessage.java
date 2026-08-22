package com.chess.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WsChessMessage {
    @NotBlank(message = "Type is required")

    @Size(min = 3, max = 50, message = "Type must be between 3 and 50 characters")
    private String type;

    @NotBlank(message = "Room ID is required")
    @Size(min = 1, max = 50, message = "Room ID must be between 3 and 50 characters")
    private String roomId;

    @NotBlank(message = "Sender is required")
    @Size(min = 3, max = 50, message = "Sender must be between 3 and 50 characters")
    private String sender;

    @Size(min = 3, max = 50, message = "Player color must be between 3 and 50 characters")
    private String playerColor;

    @Size(min = 1, max = 3, message = "From square must be a valid chess square (e.g., 'e4')")
    private String from;

    @Size(min = 1, max = 3, message = "To square must be a valid chess square (e.g., 'e5')")
    private String to;

    @Size(max = 1, message = "Promotion piece must be a single character")
    private String promotion;

    @Size(min = 1, max = 10, message = "SAN notation must be between 3 and 10 characters")
    private String san;

    @Size(min = 1, max = 200, message = "Text must be between 1 and 200 characters")
    private String text;

    @Size(min = 3, max = 50, message = "Time control must be between 3 and 50 characters")
    private String timeControl;
}