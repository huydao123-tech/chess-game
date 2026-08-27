package com.chess.dto.request;

import com.chess.enums.TournamentFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTournamentRoomRequestDTO {

    private Long id;

    @NotBlank(message = "Tên giải đấu không được để trống")
    @Size(min = 3, max = 100, message = "Tên giải đấu phải từ 3 đến 100 ký tự")
    private String name;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private LocalDateTime endTime;

    @Min(value = 60, message = "Thời gian mỗi bên tối thiểu là 60 giây")
    private int timeControl;

    @Min(value = 2, message = "Số lượng kỳ thủ tối đa tối thiểu là 2")
    @Max(value = 128, message = "Số lượng kỳ thủ tối đa không vượt quá 128")
    private Integer maxParticipants; // Số lượng người tham gia tối đa (VD: 8, 16, 32...)

    @Min(value = 2, message = "Số lượng kỳ thủ tối thiểu là 2")
    private Integer minParticipants; // Số lượng người tham gia tối thiểu để bắt đầu (VD: 4)

    private TournamentFormat format; // Thể thức thi đấu: SINGLE_ELIMINATION, ROUND_ROBIN, SWISS

    // Explicit Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public int getTimeControl() {
        return timeControl;
    }

    public void setTimeControl(int timeControl) {
        this.timeControl = timeControl;
    }

    public Integer getMaxParticipants() {
        return maxParticipants;
    }

    public void setMaxParticipants(Integer maxParticipants) {
        this.maxParticipants = maxParticipants;
    }

    public Integer getMinParticipants() {
        return minParticipants;
    }

    public void setMinParticipants(Integer minParticipants) {
        this.minParticipants = minParticipants;
    }

    public TournamentFormat getFormat() {
        return format;
    }

    public void setFormat(TournamentFormat format) {
        this.format = format;
    }
}