package com.chess.enums;

public enum TournamentStatus {
    // createRoom, editRoom
        DRAFT,       // Đang tạo/chỉnh sửa, chưa public
        // uploadRoomToPublic, 
    UPCOMING,    // Đã public, chưa mở đăng ký
    // openRegistration
    REGISTRATION, // Đang mở đăng ký
    FULL,        // Đã đủ người
    READY,       // Đã đóng đăng ký, sẵn sàng bắt đầu
    ONGOING,     // Đang diễn ra
    PAUSED,      // Tạm dừng
    FINISHED,    // Kết thúc bình thường
    CANCELLED    // Bị hủy

}

/*
[DRAFT] ──────(Đăng công khai)──────> [UPCOMING]
  │                                      │
  │ (Mở ĐK trực tiếp)                   │ (Đến giờ mở ĐK)
  ▼                                      ▼
[REGISTRATION] ◄───(Hủy/Rút bớt)──── [FULL]
  │                                      │
  ├───────(Chốt danh sách/Hết hạn)───────┘
  ▼
[READY] ───────(Bắt đầu giải)───────> [ONGOING] ◄───(Tiếp tục)───┐
  │                                      │                       │
  │                                      ├─(Sự cố/Tạm dừng)─> [PAUSED]
  │                                      │
  ▼                                      ▼
[CANCELLED] ◄────(Hủy giải)───────── [FINISHED]

 */