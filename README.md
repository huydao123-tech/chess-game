### 🔹 S1: STATE (Trạng thái)
* **Input:** Client gửi những gì lên? (Payload, Params, Headers, Token).
* **Output:** Kết quả thành công trả về gì? (Response DTO, HTTP Status).
* **Status Change:** Dữ liệu chuyển trạng thái ra sao trong Database? (VD: `DRAFT` $\rightarrow$ `REGISTRATION` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`).

### 🔹 S2: SAFETY (Phòng ngừa Rủi ro)
* **Check (Pre-conditions):** Quyền truy cập, điều kiện nghiệp vụ (VD: Đủ tiền không? Đủ slot không? Đúng trạng thái không?).
* **Concurrency (Tranh chấp):** Xử lý khi có nhiều request gửi lên trong 1 mili-giây (Dùng Pessimistic DB Lock hoặc Redis Distributed Lock).
* **Crash & Consistency:** Bọc `@Transactional` để Rollback toàn bộ nếu xảy ra lỗi giữa chừng.

### 🔹 S3: SEQUENCE (Thứ tự gõ Code)
Viết code trong `Service` theo đúng khung 4 bước chuẩn:
1. **Validate:** Check định dạng + Check điều kiện nghiệp vụ.
2. **Lock / Fetch:** Lấy dữ liệu từ DB (bọc Lock nếu xử lý tranh chấp).
3. **Execute:** Chạy logic nghiệp vụ + Đổi State trong Domain Entity.
4. **Save & Notify:** Lưu DB + Bắn Event / WebSocket / Trả Response.

---

## 2. QUY TẮC PHÂN CHIA "SỔ HỘ KHẨU" CODE

| Tầng (Layer) | Tên Class / Component | Nhiệm vụ chính | Chứa đoạn code nào? |
| :--- | :--- | :--- | :--- |
| **Request DTO** | `...RequestDTO` | **Chiều VÀO:** Hứng data từ Client gửi lên. | Các annotation validate: `@NotNull`, `@Size`, `@Min`... |
| **Response DTO** | `...ResponseDTO` | **Chiều RA:** Lọc data trả về cho UI. | Chỉ chứa các trường UI cần hiển thị, ẩn data nhạy cảm. |
| **Controller** | `...Controller` | **Lễ tân:** Tiếp nhận HTTP Request. | Gọi Service điều phối, trả HTTP Status Code. Không chứa business logic. |
| **Service** | `...Service` | **Quản đốc:** Quản lý luồng 3S Sequence. | Bọc `@Transactional`, lấy Lock, gọi Repository, điều phối Entity, bắn Noti. |
| **Domain Entity** | `...Entity` | **Chuyên gia:** Quản lý luật chuyển State. | Chứa các hàm đổi State (`start()`, `cancel()`, `join()`). |
| **Repository** | `...Repository` | **Thủ kho:** Giao tiếp Database. | Các câu lệnh truy vấn CRUD, `SELECT FOR UPDATE`. |
| **Exception** | `GlobalExceptionHandler` | **Đội dọn dẹp:** Bắt Exception hệ thống. | Format response lỗi đồng nhất (HTTP 400, 404, 409, 500). |

---

## 3. CÔNG THỨC XÁC ĐỊNH FILE CẦN TẠO

Toàn bộ các file trong một Flow được xác định từ **3 nguồn dữ liệu gốc**:

1. **Từ DB Diagram $\rightarrow$ Tạo Entity:** Thấy 1 Bảng (Table) trong DB schema $\rightarrow$ Tạo 1 Class `@Entity`.
2. **Từ UI Form Input $\rightarrow$ Tạo Request DTO:** Các ô nhập liệu trên giao diện $\rightarrow$ Tạo `...RequestDTO`.
3. **Từ UI Screen Output $\rightarrow$ Tạo Response DTO:** Các thông số cần hiển thị trên màn hình $\rightarrow$ Tạo `...ResponseDTO`.

---

## 4. CODE MẪU THỰC HÀNH CHUẨN (FLOW: TẠO PHÒNG THÁCH ĐẤU)

### 4.1. Request DTO (Chiều VÀO)
```java
// CreateRoomRequestDTO.java
public class CreateRoomRequestDTO {
    @NotNull(message = "Thể thức thời gian không được để trống")
    private TimeControl timeControl; // BLITZ_3MIN, RAPID_10MIN...

    private boolean isRated;

    @Size(max = 20, message = "Mật khẩu tối đa 20 ký tự")
    private String password;

    // Getters & Setters
    public TimeControl getTimeControl() { return timeControl; }
    public void setTimeControl(TimeControl timeControl) { this.timeControl = timeControl; }
    public boolean isRated() { return isRated; }
    public void setRated(boolean rated) { isRated = rated; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}