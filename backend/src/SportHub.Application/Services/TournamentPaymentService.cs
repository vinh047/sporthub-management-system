using System.Data;
using System.Globalization;
using SportHub.Application.DTOs.Payment;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Enums;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class TournamentPaymentService(IUnitOfWork uow, IVnPayGateway gateway) : ITournamentPaymentService
{
    public async Task<TournamentVnPayPaymentLinkResponse> CreateVnPayPaymentAsync(
        int tournamentId, int teamId, int userId, string clientIp, CancellationToken cancellationToken = default)
    {
        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var (tournament, team) = await GetOwnedTeamAsync(tournamentId, teamId, userId);
            var now = DateTime.UtcNow;
            if (tournament.Status is not ("OpenReg" or "DrawCompleted" or "InProgress") || team.Status == "Disqualified")
                throw new ConflictException("Giải đấu hoặc đội không còn đủ điều kiện thanh toán lệ phí.");

            var latest = await uow.Payments.GetLatestPaymentForTournamentTeamAsync(teamId);
            if (latest?.Status == PaymentStatus.Confirmed)
                throw new ConflictException("Đội đã thanh toán lệ phí giải đấu.");
            if (latest?.Status == PaymentStatus.Pending)
            {
                var expiry = GetExpiry(latest.CreatedAt, tournament.RegistrationDeadline);
                if (expiry <= now || string.IsNullOrWhiteSpace(latest.PaymentUrl) || latest.PaymentMethod.MethodCode != "VNPAY")
                    throw new ConflictException("Giao dịch trước đang chờ đối soát. Vui lòng kiểm tra trạng thái trước khi thanh toán lại.");
                await uow.CommitTransactionAsync();
                return new(team.Id, tournament.Id, team.TeamName, latest.Amount, latest.ReferenceCode!, latest.PaymentUrl, expiry);
            }

            var amount = ToMinorUnits(tournament.EntryFee);
            var method = await uow.Payments.GetMethodByCodeAsync("VNPAY")
                ?? throw new ValidationException(["Phương thức thanh toán VNPay chưa được kích hoạt."]);
            var reference = $"TN{Guid.NewGuid():N}"[..26];
            var expiresAt = GetExpiry(now, tournament.RegistrationDeadline);
            var url = gateway.CreatePaymentUrl(reference, amount, $"Thanh toan giai dau {tournament.Id} doi {team.Id}", clientIp, now, expiresAt);
            await uow.Payments.AddAsync(new PaymentTransaction
            {
                TournamentTeamId = team.Id, PaymentMethodId = method.Id, Amount = tournament.EntryFee,
                ReferenceCode = reference, PaymentUrl = url, CreatedAt = now,
                Status = PaymentStatus.Pending, TransactionType = PaymentTransactionType.Payment
            });
            await uow.SaveChangesAsync(cancellationToken);
            await uow.CommitTransactionAsync();
            return new(team.Id, tournament.Id, team.TeamName, tournament.EntryFee, reference, url, expiresAt);
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }
    }

    public async Task<TournamentFeePaymentResponse?> GetPaymentStatusAsync(
        int tournamentId, int teamId, int userId, CancellationToken cancellationToken = default)
    {
        var (tournament, team) = await GetOwnedTeamAsync(tournamentId, teamId, userId);
        var payment = await uow.Payments.GetLatestPaymentForTournamentTeamAsync(teamId);
        var teamStatus = team.Status == "Approved" && tournament.EntryFee > 0 && payment?.Status != PaymentStatus.Confirmed
            ? "Registered" : team.Status;
        return payment is null ? null : new(payment.Id, tournament.Id, tournament.Name, team.Id, team.TeamName,
            teamStatus, payment.Amount, payment.PaymentMethod.MethodCode, payment.Status.ToString(),
            payment.ReferenceCode, payment.PaymentUrl, payment.CreatedAt, payment.ProcessedAt);
    }

    public async Task<VnPayIpnResponse> ProcessVnPayIpnAsync(
        IReadOnlyDictionary<string, string> parameters, CancellationToken cancellationToken = default)
    {
        if (!gateway.IsValidSignature(parameters))
            return new("97", "Invalid signature");
        if (!parameters.TryGetValue("vnp_TxnRef", out var reference) ||
            !parameters.TryGetValue("vnp_Amount", out var rawAmount) ||
            !parameters.TryGetValue("vnp_ResponseCode", out var responseCode) ||
            !parameters.TryGetValue("vnp_TransactionStatus", out var status))
            return new("99", "Missing required parameters");

        await uow.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var payment = await uow.Payments.GetByReferenceCodeAsync(reference);
            if (!IsTournamentPayment(payment))
                return await CompleteAsync("01", "Order not found");
            if (!long.TryParse(rawAmount, NumberStyles.None, CultureInfo.InvariantCulture, out var amount) || amount != ToMinorUnits(payment!.Amount))
                return await CompleteAsync("04", "Invalid amount");
            if (payment.Status == PaymentStatus.Confirmed)
                return await CompleteAsync("00", "Already confirmed");
            if (responseCode == "00" && status == "00")
            {
                if (!parameters.TryGetValue("vnp_TransactionNo", out var transactionNo) || string.IsNullOrWhiteSpace(transactionNo) ||
                    !parameters.TryGetValue("vnp_PayDate", out var payDate) ||
                    !DateTime.TryParseExact(payDate, "yyyyMMddHHmmss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var localDate))
                    return await CompleteAsync("04", "Invalid transaction data");
                payment.Status = PaymentStatus.Confirmed;
                payment.ProviderTransactionId = transactionNo;
                payment.ProviderTransactionDate = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified),
                    TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"));
                // Never reinstate a disqualified team, even when a delayed payment settles.
                if (payment.TournamentTeam!.Status == "Registered")
                    payment.TournamentTeam.Status = "Approved";
            }
            else
                payment.Status = PaymentStatus.Failed;
            payment.ProcessedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(cancellationToken);
            return await CompleteAsync("00", "Acknowledged");
        }
        catch
        {
            await uow.RollbackTransactionAsync();
            throw;
        }

        async Task<VnPayIpnResponse> CompleteAsync(string code, string message)
        {
            await uow.CommitTransactionAsync();
            return new(code, message);
        }
    }

    public async Task<TournamentVnPayReturnResult> ValidateVnPayReturnAsync(
        IReadOnlyDictionary<string, string> parameters, CancellationToken cancellationToken = default)
    {
        if (!gateway.IsValidSignature(parameters) || !parameters.TryGetValue("vnp_TxnRef", out var reference) ||
            !parameters.TryGetValue("vnp_Amount", out var rawAmount) ||
            !long.TryParse(rawAmount, NumberStyles.None, CultureInfo.InvariantCulture, out var amount))
            return new(false, false, null, null);
        var payment = await uow.Payments.GetByReferenceCodeAsync(reference);
        if (!IsTournamentPayment(payment) || amount != ToMinorUnits(payment!.Amount))
            return new(false, false, null, null);
        return new(true, parameters.GetValueOrDefault("vnp_ResponseCode") == "00" && parameters.GetValueOrDefault("vnp_TransactionStatus") == "00",
            payment.TournamentTeam!.TournamentId, payment.TournamentTeamId);
    }

    private async Task<(Tournament Tournament, TournamentTeam Team)> GetOwnedTeamAsync(int tournamentId, int teamId, int userId)
    {
        var tournament = await uow.Tournaments.GetByIdWithDetailsAsync(tournamentId)
            ?? throw new NotFoundException("Giải đấu", tournamentId);
        var team = tournament.Teams.FirstOrDefault(t => t.Id == teamId)
            ?? throw new NotFoundException("Đội thi đấu", teamId);
        if (!team.Athletes.Any(a => a.UserId == userId && a.IsCaptain))
            throw new ForbiddenException("Chỉ đội trưởng được thanh toán và xem giao dịch của đội.");
        return (tournament, team);
    }

    private static bool IsTournamentPayment(PaymentTransaction? payment) =>
        payment is { TournamentTeamId: not null, TournamentTeam: not null, BookingId: null, SocialParticipantId: null,
            TransactionType: PaymentTransactionType.Payment } && payment.PaymentMethod.MethodCode == "VNPAY";

    private static DateTime GetExpiry(DateTime createdAt, DateTime deadline) =>
        // Preserve the expiry of links issued before registration closed.
        // Registered teams can start a new 15-minute payment after that deadline.
        createdAt < deadline && deadline < createdAt.AddMinutes(15) ? deadline : createdAt.AddMinutes(15);

    private static long ToMinorUnits(decimal amount)
    {
        var units = amount * 100m;
        if (amount <= 0 || units != decimal.Truncate(units) || units > long.MaxValue)
            throw new ValidationException(["Lệ phí giải đấu không hợp lệ để thanh toán VNPay."]);
        return decimal.ToInt64(units);
    }
}
