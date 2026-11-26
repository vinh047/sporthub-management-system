---
name: sporthub-pricing-engine
description: "Quy chuẩn tính giá sân linh hoạt theo khung giờ cao điểm, phụ thu cuối tuần, chính sách giá chi nhánh và môn thể thao cho SportHub"
---

# Quy Chuẩn Bảng Giá & Tính Giá Sân (Dev 3 & Dev 1)

Áp dụng skill này khi phát triển `PricingService`, cấu hình `PricePolicy`, `PriceRuleDetail` và tính toán `SlotPrice` trong luồng đặt sân.

## 1. Nguyên Tắc Tính Giá Từng Khung Giờ

Mỗi ô sân (`TimeSlot`) trong một ngày (`PlayDate`) có mức giá được tính toán động theo thứ tự ưu tiên:

1. **Giá Cơ Bản (Base Price)**:
   - Được định nghĩa theo loại sân (`CourtType`: Trong nhà / Ngoài trời) và môn thể thao (`Sport`).
2. **Khung Giờ (Peak vs Off-Peak Hours)**:
   - **Giờ thấp điểm (Off-peak)**: Ví dụ 06:00 - 17:00 các ngày trong tuần (hệ số 1.0 hoặc giảm giá).
   - **Giờ cao điểm (Peak)**: Ví dụ 17:00 - 22:00 các ngày trong tuần (hệ số x1.2 - x1.5).
3. **Phụ Thu Ngày (Weekend & Holiday Surcharge)**:
   - Thứ 7 và Chủ Nhật (`DayOfWeek.Saturday`, `DayOfWeek.Sunday`): Áp dụng phụ thu cuối tuần (cộng thêm hoặc nhân hệ số).
   - Ngày lễ đặc biệt: Áp dụng bảng giá ngày lễ nếu có thiết lập.
4. **Quy Tắc Tính Cuối Cùng**:
   ```
   SlotPrice = BasePrice * PeakMultiplier + WeekendSurcharge
   ```

## 2. Giao Ước Interface Giữa Các Module

- **Interface yêu cầu**:
  ```csharp
  public interface IPricingService
  {
      Task<decimal> CalculateSlotPriceAsync(int courtId, DateOnly playDate, int timeSlotId);
      Task<PriceBreakdownResponse> GetSlotPriceBreakdownAsync(int courtId, DateOnly playDate, int timeSlotId);
  }
  ```
- **Ràng buộc**: Khi chưa có dữ liệu cấu hình trong DB, hệ thống bắt buộc có giá Fallback hợp lý (ví dụ: 100,000 VND / slot) để không làm gãy luồng đặt sân của các module khác.
