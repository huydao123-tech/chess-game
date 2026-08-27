package com.chess.enums;

public enum MatchStatus {
    SCHEDULED,   // Đã lên lịch, chưa bắt đầu
    READY,       // Cả 2 kỳ thủ đã xác nhận sẵn sàng
    PLAYING,     // Đang thi đấu
    FINISHED,    // Đã kết thúc bình thường
    BYE,         // Miễn đấu (do đối thủ vắng mặt hoặc lẻ người)
    CANCELLED    // Trận đấu bị hủy
}
