package com.chess.controllers;

import com.chess.dto.WsChessMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WsGameController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/game/{roomId}/join")
    public void joinGame(@DestinationVariable String roomId, @Payload WsChessMessage message) {
        messagingTemplate.convertAndSend("/topic/game/" + roomId, message);
    }

    @MessageMapping("/game/{roomId}/move")
    public void receivePiece(@DestinationVariable String roomId, @Payload WsChessMessage message) {
        messagingTemplate.convertAndSend("/topic/game/" + roomId, message);
    }

    @MessageMapping("/game/{roomId}/chat")
    public void sendChatMessage(@DestinationVariable String roomId, @Payload WsChessMessage message) {
        messagingTemplate.convertAndSend("/topic/game/" + roomId, message);
    }

    @MessageMapping("/game/{roomId}/action")
    public void resignGame(@DestinationVariable String roomId, @Payload WsChessMessage message) {
        messagingTemplate.convertAndSend("/topic/game/" + roomId, message);
    }
}