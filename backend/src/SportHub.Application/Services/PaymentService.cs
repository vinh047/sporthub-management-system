using System.Data;
using System.Globalization;
using System.Net.Http;
using Microsoft.Extensions.Logging;
using SportHub.Application.DTOs.Booking;
using SportHub.Application.DTOs.Payment;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class PaymentService(
    IUnitOfWork uow,
    IVnPayGateway vnPayGateway,
    ICourtStatusNotifier courtStatusNotifier,
    ILogger<PaymentService> logger) : IPaymentService
{
    private static TimeZoneInfo BookingTimeZone =>
        TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    public async Task<VnPayPaymentLinkResponse> CreateVnPayPaymentAsync(
        int bookingId,
        int userId,
        string clientIp,
        CancellationToken cancellationToken = default)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var booking = await uow.Bookings.GetByIdWithDetailsAsync(bookingId)
                ?? throw new NotFoundException("Đơn đặt sân", bookingId.ToString());
            EnsureOwner(booking, userId);

            if (booking.BookingStatus != BookingStatus.Held ||
                booking.HoldExpiresAt is null ||
                booking.HoldExpiresAt <= DateTime.UtcNow)
                throw new ConflictException("Thời gian giữ chỗ đã hết hoặc đơn không còn chờ thanh toán.");

            var latestPayment = await uow.Payments.GetLatestPaymentForBookingAsync(bookingId);
            if (latestPayment?.Status == PaymentStatus.Confirmed)
                throw new ConflictException("Đơn này đã được thanh toán.");
            if (latestPayment?.Status == PaymentStatus.Pending)
            {
                if (!string.IsNullOrWhiteSpace(latestPayment.PaymentUrl))
                {
                    await uow.CommitTransactionAsync();
                    return new VnPayPaymentLinkResponse(
                        booking.Id,
                        booking.BookingCode,
                        latestPayment.PaymentUrl,
                        booking.HoldExpiresAt.Value);
                }

                throw new ConflictException("Giao dịch thanh toán trước đang được xử lý. Vui lòng kiểm tra lại sau.");
            }

            var paymentMethod = await uow.Payments.GetMethodByCodeAsync("VNPAY")
                ?? throw new ValidationException(["Phương thức thanh toán VNPay chưa được kích hoạt. Chạy lệnh seed để cập nhật dữ liệu."]);

            var transactionReference = $"SH{Guid.NewGuid():N}"[..26];
            var amount = ToMinorUnits(booking.FinalAmount);
            var createdAt = DateTime.UtcNow;
            var paymentUrl = vnPayGateway.CreatePaymentUrl(
                transactionReference,
                amount,
                $"Thanh toan booking {booking.BookingCode}",
                clientIp,
                createdAt,
                booking.HoldExpiresAt.Value);
            var payment = new PaymentTransaction
            {
                BookingId = booking.Id,
                PaymentMethodId = paymentMethod.Id,
                Amount = booking.FinalAmount,
                ReferenceCode = transactionReference,
                PaymentUrl = paymentUrl,
                Status = PaymentStatus.Pending,
                TransactionType = PaymentTransactionType.Payment
            };

            await uow.Payments.AddAsync(payment);
            await uow.SaveChangesAsync(cancellationToken);
            await uow.CommitTransactionAsync();

            return new VnPayPaymentLinkResponse(
                booking.Id,
                booking.BookingCode,
                paymentUrl,
                booking.HoldExpiresAt.Value);
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
    }

    public async Task<VnPayIpnResponse> ProcessVnPayIpnAsync(
        IReadOnlyDictionary<string, string> parameters,
        string clientIp,
        CancellationToken cancellationToken = default)
    {
        if (!vnPayGateway.IsValidSignature(parameters))
            return new VnPayIpnResponse("97", "Invalid signature");

        if (!parameters.TryGetValue("vnp_TxnRef", out var transactionReference) ||
            !parameters.TryGetValue("vnp_Amount", out var receivedAmount) ||
            !parameters.TryGetValue("vnp_ResponseCode", out var responseCode) ||
            !parameters.TryGetValue("vnp_TransactionStatus", out var transactionStatus))
            return new VnPayIpnResponse("99", "Missing required parameters");

        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        PaymentTransaction? payment = null;
        Booking? booking = null;
        PaymentTransaction? refund = null;
        var notifyConfirmedSlots = false;
        try
        {
            payment = await uow.Payments.GetByReferenceCodeAsync(transactionReference);
            if (payment is null ||
                payment.TransactionType != PaymentTransactionType.Payment ||
                payment.BookingId is null)
                return await CompleteIpnAsync("01", "Order not found");

            booking = await uow.Bookings.GetByIdWithDetailsAsync(payment.BookingId.Value);
            if (booking is null)
                return await CompleteIpnAsync("01", "Order not found");

            if (!long.TryParse(receivedAmount, NumberStyles.None, CultureInfo.InvariantCulture, out var amount) ||
                amount != ToMinorUnits(payment.Amount))
                return await CompleteIpnAsync("04", "Invalid amount");

            if (payment.Status == PaymentStatus.Confirmed)
                return await CompleteIpnAsync("00", "Already confirmed");

            var isSuccessful = responseCode == "00" && transactionStatus == "00";
            if (!isSuccessful)
            {
                payment.Status = PaymentStatus.Failed;
                await uow.SaveChangesAsync(cancellationToken);
                return await CompleteIpnAsync("00", "Acknowledged");
            }

            if (!parameters.TryGetValue("vnp_TransactionNo", out var providerTransactionId) ||
                !parameters.TryGetValue("vnp_PayDate", out var providerPaymentDate) ||
                !TryParseProviderDate(providerPaymentDate, out var providerTransactionDate))
                return await CompleteIpnAsync("04", "Invalid transaction data");

            payment.Status = PaymentStatus.Confirmed;
            payment.ProviderTransactionId = providerTransactionId;
            payment.ProviderTransactionDate = providerTransactionDate;
            payment.ProcessedAt = DateTime.UtcNow;
            var hasPriorSuccessfulPayment = booking.PaymentTransactions.Any(transaction =>
                transaction.Id != payment.Id &&
                transaction.TransactionType == PaymentTransactionType.Payment &&
                transaction.Status == PaymentStatus.Confirmed);

            if (booking.BookingStatus == BookingStatus.Held &&
                booking.HoldExpiresAt > DateTime.UtcNow &&
                !hasPriorSuccessfulPayment)
            {
                booking.BookingStatus = BookingStatus.Confirmed;
                notifyConfirmedSlots = true;
            }
            else if (booking.BookingStatus == BookingStatus.Held ||
                     booking.BookingStatus == BookingStatus.Cancelled)
            {
                booking.BookingStatus = BookingStatus.Cancelled;
                var cancellation = booking.Cancellation;
                if (cancellation is null)
                {
                    cancellation = new BookingCancellation
                    {
                        BookingId = booking.Id,
                        CancelledByUserId = booking.UserId
                            ?? throw new InvalidOperationException("VNPay payment cannot be attached to a guest booking."),
                        CancelledAt = DateTime.UtcNow,
                        CancelReason = "Tự động hủy do VNPay xác nhận sau khi thời gian giữ chỗ kết thúc.",
                        RefundPercent = 100m,
                        RefundAmount = payment.Amount,
                        PenaltyAmount = 0m,
                        RefundStatus = RefundStatus.Pending
                    };
                    booking.Cancellation = cancellation;
                }
                else if (cancellation.RefundAmount == 0m)
                {
                    cancellation.RefundPercent = 100m;
                    cancellation.RefundAmount = payment.Amount;
                    cancellation.PenaltyAmount = 0m;
                    cancellation.RefundStatus = RefundStatus.Pending;
                }

                refund = await GetOrCreateRefundAsync(booking, payment, payment.Amount);
            }
            else if (booking.BookingStatus == BookingStatus.Confirmed && hasPriorSuccessfulPayment)
            {
                refund = await GetOrCreateRefundAsync(booking, payment, payment.Amount);
            }

            await uow.SaveChangesAsync(cancellationToken);
            await uow.CommitTransactionAsync();
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }

        if (notifyConfirmedSlots && booking is not null)
            await NotifyBookingSlotsAsync(booking, "Confirmed");

        if (refund is not null && payment is not null && booking is not null)
            await SubmitRefundAsync(booking, payment, refund, clientIp, cancellationToken);

        return new VnPayIpnResponse("00", "Confirm Success");

        async Task<VnPayIpnResponse> CompleteIpnAsync(string code, string message)
        {
            await uow.CommitTransactionAsync();
            return new VnPayIpnResponse(code, message);
        }
    }

    public async Task<VnPayReturnResult> ValidateVnPayReturnAsync(
        IReadOnlyDictionary<string, string> parameters,
        CancellationToken cancellationToken = default)
    {
        if (!vnPayGateway.IsValidSignature(parameters) ||
            !parameters.TryGetValue("vnp_TxnRef", out var transactionReference) ||
            !parameters.TryGetValue("vnp_Amount", out var receivedAmount) ||
            !long.TryParse(receivedAmount, NumberStyles.None, CultureInfo.InvariantCulture, out var amount))
            return new VnPayReturnResult(false, false, null);

        var payment = await uow.Payments.GetByReferenceCodeAsync(transactionReference);
        if (payment is null ||
            payment.TransactionType != PaymentTransactionType.Payment ||
            payment.BookingId is null ||
            amount != ToMinorUnits(payment.Amount))
            return new VnPayReturnResult(false, false, null);

        var paymentReportedSuccessful =
            parameters.TryGetValue("vnp_ResponseCode", out var responseCode) &&
            responseCode == "00" &&
            parameters.TryGetValue("vnp_TransactionStatus", out var transactionStatus) &&
            transactionStatus == "00";

        return new VnPayReturnResult(
            true,
            paymentReportedSuccessful,
            payment?.BookingId);
    }

    public async Task<BookingPaymentStatusResponse> GetBookingPaymentStatusAsync(
        int bookingId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var booking = await uow.Bookings.GetByIdWithDetailsAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId.ToString());
        EnsureOwner(booking, userId);
        return MapPaymentStatus(booking);
    }

    public async Task<BookingPaymentStatusResponse> ProcessCancellationRefundAsync(
        int bookingId,
        int userId,
        string clientIp,
        CancellationToken cancellationToken = default)
    {
        var booking = await uow.Bookings.GetByIdWithDetailsAsync(bookingId)
            ?? throw new NotFoundException("Đơn đặt sân", bookingId.ToString());
        EnsureOwner(booking, userId);
        var cancellation = booking.Cancellation
            ?? throw new ConflictException("Đơn chưa có thông tin hủy.");

        if (cancellation.RefundAmount <= 0m)
        {
            cancellation.RefundStatus = RefundStatus.NotRequired;
            await uow.SaveChangesAsync(cancellationToken);
            return MapPaymentStatus(booking);
        }

        if (cancellation.RefundStatus is RefundStatus.Processing or RefundStatus.Completed or RefundStatus.Failed or RefundStatus.ManualRequired)
            return MapPaymentStatus(booking);

        var payment = await uow.Payments.GetSuccessfulVnPayPaymentForBookingAsync(bookingId);
        if (payment is null)
        {
            var latestPayment = await uow.Payments.GetLatestPaymentForBookingAsync(bookingId);
            if (latestPayment?.Status == PaymentStatus.Pending)
            {
                cancellation.RefundStatus = RefundStatus.Pending;
                cancellation.RefundFailureReason = null;
            }
            else if (latestPayment is not null && latestPayment.Status == PaymentStatus.Confirmed)
            {
                cancellation.RefundStatus = RefundStatus.ManualRequired;
                cancellation.RefundFailureReason = "Giao dịch không được thanh toán qua VNPay; cần nhân viên xử lý hoàn thủ công.";
            }
            else
            {
                cancellation.RefundStatus = RefundStatus.NotRequired;
            }

            await uow.SaveChangesAsync(cancellationToken);
            return MapPaymentStatus(booking);
        }

        if (string.IsNullOrWhiteSpace(payment.ProviderTransactionId) ||
            payment.ProviderTransactionDate is null)
        {
            cancellation.RefundStatus = RefundStatus.Failed;
            cancellation.RefundFailureReason = "Thiếu dữ liệu giao dịch VNPay cần thiết để gửi yêu cầu hoàn.";
            await uow.SaveChangesAsync(cancellationToken);
            return MapPaymentStatus(booking);
        }

        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        PaymentTransaction? refund;
        var shouldSubmit = false;
        try
        {
            refund = await uow.Payments.GetRefundForPaymentAsync(payment.Id);
            if (refund is null)
            {
                refund = CreateRefundTransaction(booking, payment, cancellation.RefundAmount);
                await uow.Payments.AddAsync(refund);
                cancellation.RefundStatus = RefundStatus.Pending;
                cancellation.RefundFailureReason = null;
                shouldSubmit = true;
            }
            else if (refund.Status == PaymentStatus.Pending && cancellation.RefundStatus == RefundStatus.Pending)
            {
                shouldSubmit = true;
            }
            else if (refund.Status == PaymentStatus.Confirmed)
            {
                cancellation.RefundStatus = RefundStatus.Processing;
                cancellation.RefundFailureReason = null;
            }
            else if (refund.Status == PaymentStatus.Failed)
            {
                cancellation.RefundStatus = RefundStatus.Failed;
                cancellation.RefundFailureReason ??= "VNPay đã từ chối yêu cầu hoàn tiền.";
            }

            await uow.SaveChangesAsync(cancellationToken);
            await uow.CommitTransactionAsync();
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }

        if (shouldSubmit && refund is not null)
            await SubmitRefundAsync(booking, payment, refund, clientIp, cancellationToken);

        return MapPaymentStatus(booking);
    }

    private async Task<PaymentTransaction> GetOrCreateRefundAsync(
        Booking booking,
        PaymentTransaction payment,
        decimal amount)
    {
        var existingRefund = await uow.Payments.GetRefundForPaymentAsync(payment.Id);
        if (existingRefund is not null)
            return existingRefund;

        var refund = CreateRefundTransaction(booking, payment, amount);
        await uow.Payments.AddAsync(refund);
        return refund;
    }

    private static PaymentTransaction CreateRefundTransaction(
        Booking booking,
        PaymentTransaction payment,
        decimal amount)
        => new()
        {
            BookingId = booking.Id,
            PaymentMethodId = payment.PaymentMethodId,
            Amount = amount,
            ReferenceCode = $"RF{Guid.NewGuid():N}"[..26],
            Status = PaymentStatus.Pending,
            TransactionType = PaymentTransactionType.Refund,
            RelatedTransactionId = payment.Id
        };

    private async Task SubmitRefundAsync(
        Booking booking,
        PaymentTransaction payment,
        PaymentTransaction refund,
        string clientIp,
        CancellationToken cancellationToken)
    {
        if (payment.ProviderTransactionDate is null ||
            string.IsNullOrWhiteSpace(payment.ProviderTransactionId) ||
            string.IsNullOrWhiteSpace(payment.ReferenceCode))
        {
            MarkRefundFailed(booking, refund, "Thiếu dữ liệu giao dịch gốc để hoàn tiền.");
            await uow.SaveChangesAsync(cancellationToken);
            return;
        }

        try
        {
            if (booking.Cancellation is not null)
            {
                booking.Cancellation.RefundStatus = RefundStatus.Processing;
                booking.Cancellation.RefundFailureReason = null;
                await uow.SaveChangesAsync(cancellationToken);
            }

            var isFullRefund = refund.Amount >= payment.Amount;
            var result = await vnPayGateway.RefundAsync(
                new VnPayRefundRequest(
                    payment.ReferenceCode,
                    ToMinorUnits(refund.Amount),
                    payment.ProviderTransactionId,
                    payment.ProviderTransactionDate.Value,
                    $"Hoan tien booking {booking.BookingCode}",
                    refund.ReferenceCode ?? throw new InvalidOperationException("Refund request reference is missing."),
                    clientIp,
                    isFullRefund ? "02" : "03"),
                cancellationToken);

            if (result.Accepted)
            {
                refund.Status = PaymentStatus.Confirmed;
                refund.ProcessedAt = DateTime.UtcNow;
                refund.ProviderTransactionId = result.ProviderReference;
                if (booking.Cancellation is not null)
                {
                    booking.Cancellation.RefundStatus = RefundStatus.Processing;
                    booking.Cancellation.RefundFailureReason = null;
                }
            }
            else
            {
                MarkRefundFailed(booking, refund, result.Message ?? $"VNPay từ chối yêu cầu hoàn ({result.ResponseCode}).");
            }

            await uow.SaveChangesAsync(cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            MarkRefundUnconfirmed(booking, refund);
            await uow.SaveChangesAsync(cancellationToken);
            logger.LogWarning(exception, "VNPay refund request outcome is unknown for booking {BookingId}.", booking.Id);
        }
        catch (TaskCanceledException exception)
        {
            MarkRefundUnconfirmed(booking, refund);
            await uow.SaveChangesAsync(CancellationToken.None);
            logger.LogWarning(exception, "VNPay refund request timed out for booking {BookingId}.", booking.Id);
        }
        catch (InvalidOperationException exception)
        {
            MarkRefundFailed(booking, refund, exception.Message);
            await uow.SaveChangesAsync(cancellationToken);
            logger.LogError(exception, "VNPay refund could not be submitted for booking {BookingId}.", booking.Id);
        }
        catch (InvalidDataException exception)
        {
            MarkRefundFailed(booking, refund, "Không xác thực được phản hồi hoàn tiền từ VNPay.");
            await uow.SaveChangesAsync(cancellationToken);
            logger.LogError(exception, "VNPay refund response could not be verified for booking {BookingId}.", booking.Id);
        }
    }

    private static void MarkRefundFailed(Booking booking, PaymentTransaction refund, string reason)
    {
        refund.Status = PaymentStatus.Failed;
        refund.ProcessedAt = DateTime.UtcNow;
        if (booking.Cancellation is not null)
        {
            booking.Cancellation.RefundStatus = RefundStatus.Failed;
            booking.Cancellation.RefundFailureReason = reason.Length <= 500 ? reason : reason[..500];
        }
    }

    private static void MarkRefundUnconfirmed(Booking booking, PaymentTransaction refund)
    {
        refund.Status = PaymentStatus.Pending;
        if (booking.Cancellation is not null)
        {
            booking.Cancellation.RefundStatus = RefundStatus.Processing;
            booking.Cancellation.RefundFailureReason = "VNPay chưa trả kết quả cuối cùng. Không gửi lặp để tránh hoàn tiền hai lần.";
        }
    }

    private async Task NotifyBookingSlotsAsync(Booking booking, string status)
    {
        foreach (var detail in booking.Details)
        {
            await courtStatusNotifier.NotifySlotUpdatedAsync(
                detail.Court.FacilityId,
                detail.CourtId,
                detail.PlayDate,
                detail.TimeSlotId,
                status);
        }
    }

    private static BookingPaymentStatusResponse MapPaymentStatus(Booking booking)
    {
        var payment = booking.PaymentTransactions
            .Where(transaction => transaction.TransactionType == PaymentTransactionType.Payment)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .FirstOrDefault();
        var cancellation = booking.Cancellation;
        var refund = booking.PaymentTransactions
            .Where(transaction => transaction.TransactionType == PaymentTransactionType.Refund)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .FirstOrDefault();
        var refundStatus = refund?.Status switch
        {
            PaymentStatus.Confirmed => RefundStatus.Processing,
            PaymentStatus.Pending => RefundStatus.Processing,
            PaymentStatus.Failed => RefundStatus.Failed,
            PaymentStatus.Refunded => RefundStatus.Completed,
            _ => cancellation?.RefundStatus
        };
        var refundAmount = refund?.Amount ?? cancellation?.RefundAmount ?? 0m;
        var refundNote = refundStatus switch
        {
            RefundStatus.Processing => "Yêu cầu hoàn đã được gửi/đang đối soát. Tiền dự kiến về sau 1–3 ngày làm việc.",
            RefundStatus.Pending => "Yêu cầu hoàn đang chờ xử lý. Thời gian dự kiến nhận tiền là 1–3 ngày làm việc.",
            RefundStatus.Failed => "Yêu cầu hoàn tiền chưa thành công. Vui lòng liên hệ bộ phận hỗ trợ.",
            RefundStatus.ManualRequired => "Khoản hoàn cần nhân viên xác nhận và xử lý thủ công.",
            RefundStatus.NotRequired => "Đơn này không phát sinh khoản hoàn tiền.",
            RefundStatus.Completed => "Khoản tiền đã được hoàn.",
            _ => null
        };

        return new BookingPaymentStatusResponse(
            booking.Id,
            booking.BookingCode,
            booking.BookingStatus.ToString(),
            payment?.Status.ToString(),
            refundStatus?.ToString(),
            refundAmount,
            refundNote);
    }

    private static long ToMinorUnits(decimal amount)
    {
        var minorUnits = amount * 100m;
        if (amount <= 0m || minorUnits != decimal.Truncate(minorUnits) || minorUnits > long.MaxValue)
            throw new ValidationException(["Số tiền thanh toán VNPay không hợp lệ."]);

        return decimal.ToInt64(minorUnits);
    }

    private static bool TryParseProviderDate(string value, out DateTime utcDate)
    {
        utcDate = default;
        if (!DateTime.TryParseExact(
                value,
                "yyyyMMddHHmmss",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var localDate))
            return false;

        utcDate = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified),
            BookingTimeZone);
        return true;
    }

    private static void EnsureOwner(Booking booking, int userId)
    {
        if (booking.UserId != userId)
            throw new ForbiddenException("Bạn không có quyền thanh toán hoặc xem giao dịch của đơn này.");
    }
}
