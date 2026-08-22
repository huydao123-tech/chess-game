import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Cấu trúc dữ liệu cho mỗi nước đi
export interface MoveAnalysis {
  moveNumber: number;          // Nước thứ mấy (vd: 1, 2, 3...)
  color: 'w' | 'b';            // Bên nào đi (Trắng / Đen)
  playedMove: string;          // Nước người chơi đã đi (vd: "Nf3")
  fenBefore: string;           // FEN trước khi đi
  fenAfter: string;            // FEN sau khi đi
  evalScore?: number;          // Điểm đánh giá (centipawns: +150, -300...)
  bestMove?: string;           // Nước đi tốt nhất máy khuyên (vd: "d2d4")
  classification?: string;     // 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER' | 'BRILLIANT'
  winrateBefore?: number;      // Tỉ lệ thắng trước khi đi (%)
  winrateAfter?: number;       // Tỉ lệ thắng sau khi đi (%)
}

export default function ReviewMatchPage() {
    const locationState = useLocation().state as { moves?: string[] } | null;
    const moves = locationState?.moves || [];
    const [_moveAnalysisList, _setMoveAnalysisList] = useState<MoveAnalysis[]>([]);

    useEffect(() => {
      console.log("Kết quả trận đấu mới cập nhật:", moves);
    }, [moves]);

    return (
      <div className="page" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Phân tích ván đấu</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Tính năng xem lại nước đi đang được cập nhật.</p>
      </div>
    );
}