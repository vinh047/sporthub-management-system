using SportHub.Application.DTOs.Report;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Application.Interfaces.Services;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public class ReportService(IUnitOfWork uow) : IReportService
{
    public async Task<RevenueReportResponse> GetRevenueReportAsync(
        int? facilityId,
        DateOnly from,
        DateOnly to,
        int? sportId = null,
        bool onlyPeakHours = false)
    {
        ValidateDateRange(from, to);

        var normalizedFacilityId = facilityId.HasValue && facilityId.Value > 0 ? facilityId.Value : (int?)null;
        var normalizedSportId = sportId.HasValue && sportId.Value > 0 ? sportId.Value : (int?)null;

        Facility? targetFacility = null;
        if (normalizedFacilityId.HasValue)
        {
            targetFacility = await uow.Facilities.GetByIdAsync(normalizedFacilityId.Value)
                ?? throw new NotFoundException("Cơ sở", normalizedFacilityId.Value);
        }

        Sport? targetSport = null;
        if (normalizedSportId.HasValue)
        {
            targetSport = await uow.Facilities.GetSportByIdAsync(normalizedSportId.Value)
                ?? throw new NotFoundException("Môn thể thao", normalizedSportId.Value);
        }

        var facilities = await uow.Reports.GetActiveFacilitiesAsync(normalizedFacilityId);
        var sports = await uow.Reports.GetActiveSportsAsync(normalizedSportId);
        var timeSlots = (await uow.Facilities.GetTimeSlotsAsync()).OrderBy(ts => ts.StartTime).ToList();
        var pricePolicies = await uow.Reports.GetActivePricePoliciesWithRulesAsync(normalizedFacilityId, normalizedSportId);
        var bookingDetails = await uow.Reports.GetConfirmedBookingDetailsAsync(from, to, normalizedFacilityId, normalizedSportId);
        var socialSessions = await uow.Reports.GetActiveSocialSessionsAsync(from, to, normalizedFacilityId, normalizedSportId);
        var tournaments = await uow.Reports.GetTournamentsInRangeAsync(from, to, normalizedFacilityId, normalizedSportId);

        var allTeamIds = tournaments.SelectMany(t => t.Teams).Select(team => team.Id).ToList();
        var confirmedTeamPayments = await uow.Reports.GetConfirmedTournamentPaymentsAsync(allTeamIds);
        var paidTeamAmountByTeamId = confirmedTeamPayments
            .Where(pt => pt.TournamentTeamId.HasValue)
            .GroupBy(pt => pt.TournamentTeamId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var enrichedDetails = bookingDetails
            .Select(bd =>
            {
                var isPeak = IsPeakHourSlot(pricePolicies, bd.Court.FacilityId, bd.Court.SportId, bd.TimeSlot);
                var netSlotRevenue = bd.Booking.TotalAmount > 0m
                    ? decimal.Round(bd.SlotPrice * (bd.Booking.FinalAmount / bd.Booking.TotalAmount), 2, MidpointRounding.AwayFromZero)
                    : bd.SlotPrice;
                return (Detail: bd, IsPeak: isPeak, NetRevenue: netSlotRevenue);
            })
            .Where(item => !onlyPeakHours || item.IsPeak)
            .ToList();

        var bookingRevenue = enrichedDetails.Sum(x => x.NetRevenue);
        var peakHourRevenue = enrichedDetails.Where(x => x.IsPeak).Sum(x => x.NetRevenue);
        var offPeakRevenue = enrichedDetails.Where(x => !x.IsPeak).Sum(x => x.NetRevenue);
        var totalBookings = enrichedDetails.Select(x => x.Detail.BookingId).Distinct().Count();
        var totalBookedSlots = enrichedDetails.Count;
        var peakBookedSlots = enrichedDetails.Count(x => x.IsPeak);

        decimal GetTournamentRevenue(SportHub.Domain.Entities.Tournament.Tournament t)
        {
            if (onlyPeakHours || t.EntryFee <= 0m) return 0m;
            decimal sum = 0m;
            foreach (var team in t.Teams.Where(tm => tm.Status != "Disqualified"))
            {
                if (paidTeamAmountByTeamId.TryGetValue(team.Id, out var paidAmt))
                    sum += paidAmt;
                else if (string.Equals(team.Status, "Approved", StringComparison.OrdinalIgnoreCase))
                    sum += t.EntryFee;
            }
            return sum;
        }

        decimal GetSocialSessionRevenue(SportHub.Domain.Entities.Social.SocialSession s)
        {
            if (onlyPeakHours) return 0m;
            return s.Participants
                .Where(p => p.Status != "Cancelled")
                .Sum(p => p.PaidAmount > 0m
                    ? p.PaidAmount
                    : (string.Equals(p.Status, "Confirmed", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(p.Status, "CheckedIn", StringComparison.OrdinalIgnoreCase)
                        ? s.FeePerSlot
                        : 0m));
        }

        var tournamentRevenue = tournaments.Sum(GetTournamentRevenue);
        var socialRevenue = socialSessions.Sum(GetSocialSessionRevenue);
        var totalRevenue = bookingRevenue + tournamentRevenue + socialRevenue;

        // 1. Thống kê theo từng ngày (DailyBreakdown)
        var dailyBreakdown = new List<DailyRevenue>();
        for (var day = from; day <= to; day = day.AddDays(1))
        {
            var dayDetails = enrichedDetails.Where(x => x.Detail.PlayDate == day).ToList();
            var dayBookingRev = dayDetails.Sum(x => x.NetRevenue);
            var dayPeakRev = dayDetails.Where(x => x.IsPeak).Sum(x => x.NetRevenue);
            var dayOffPeakRev = dayDetails.Where(x => !x.IsPeak).Sum(x => x.NetRevenue);
            var daySocialRev = socialSessions.Where(s => s.PlayDate == day).Sum(GetSocialSessionRevenue);
            var dayTourneyRev = tournaments.Where(t => t.StartDate == day).Sum(GetTournamentRevenue);
            var dayBookingsCount = dayDetails.Select(x => x.Detail.BookingId).Distinct().Count();

            dailyBreakdown.Add(new DailyRevenue(
                Date: day,
                Revenue: dayBookingRev + daySocialRev + dayTourneyRev,
                BookingCount: dayBookingsCount,
                PeakHourRevenue: dayPeakRev,
                OffPeakRevenue: dayOffPeakRev,
                OccupiedSlots: dayDetails.Count));
        }

        // 2. Thống kê theo từng Cơ sở (FacilityBreakdown)
        var facilityBreakdown = facilities
            .Select(f =>
            {
                var facDetails = enrichedDetails.Where(x => x.Detail.Court.FacilityId == f.Id).ToList();
                var facBookingRev = facDetails.Sum(x => x.NetRevenue);
                var facPeakRev = facDetails.Where(x => x.IsPeak).Sum(x => x.NetRevenue);
                var facOffPeakRev = facDetails.Where(x => !x.IsPeak).Sum(x => x.NetRevenue);
                var facTourneyRev = tournaments.Where(t => t.FacilityId == f.Id).Sum(GetTournamentRevenue);
                var facSocialRev = socialSessions.Where(s => s.FacilityId == f.Id).Sum(GetSocialSessionRevenue);

                return new FacilityRevenueBreakdown(
                    FacilityId: f.Id,
                    FacilityName: f.Name,
                    BookingRevenue: facBookingRev,
                    TournamentRevenue: facTourneyRev,
                    SocialRevenue: facSocialRev,
                    TotalRevenue: facBookingRev + facTourneyRev + facSocialRev,
                    PeakHourRevenue: facPeakRev,
                    OffPeakRevenue: facOffPeakRev,
                    TotalBookings: facDetails.Select(x => x.Detail.BookingId).Distinct().Count(),
                    BookedSlotsCount: facDetails.Count);
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ThenBy(x => x.FacilityId)
            .ToList();

        // 3. Thống kê theo từng Môn thể thao (SportBreakdown)
        var sportBreakdown = sports
            .Select(s =>
            {
                var spDetails = enrichedDetails.Where(x => x.Detail.Court.SportId == s.Id).ToList();
                var spBookingRev = spDetails.Sum(x => x.NetRevenue);
                var spPeakRev = spDetails.Where(x => x.IsPeak).Sum(x => x.NetRevenue);
                var spOffPeakRev = spDetails.Where(x => !x.IsPeak).Sum(x => x.NetRevenue);
                var spTourneyRev = tournaments.Where(t => t.SportId == s.Id).Sum(GetTournamentRevenue);
                var spSocialRev = socialSessions.Where(ss => ss.SportId == s.Id).Sum(GetSocialSessionRevenue);

                return new SportRevenueBreakdown(
                    SportId: s.Id,
                    SportName: s.SportName,
                    BookingRevenue: spBookingRev,
                    TournamentRevenue: spTourneyRev,
                    SocialRevenue: spSocialRev,
                    TotalRevenue: spBookingRev + spTourneyRev + spSocialRev,
                    PeakHourRevenue: spPeakRev,
                    OffPeakRevenue: spOffPeakRev,
                    TotalBookings: spDetails.Select(x => x.Detail.BookingId).Distinct().Count(),
                    BookedSlotsCount: spDetails.Count);
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ThenBy(x => x.SportId)
            .ToList();

        // 4. Thống kê theo từng Khung giờ / Giờ vàng (PeakHourBreakdown)
        var peakHourBreakdown = timeSlots
            .Select(slot =>
            {
                var isDefaultOrPolicyPeak = IsPeakHourSlot(
                    pricePolicies,
                    normalizedFacilityId ?? facilities.FirstOrDefault()?.Id ?? 1,
                    normalizedSportId ?? sports.FirstOrDefault()?.Id ?? 1,
                    slot);
                var slotDetails = enrichedDetails.Where(x => x.Detail.TimeSlotId == slot.Id).ToList();

                return new TimeSlotRevenueBreakdown(
                    TimeSlotId: slot.Id,
                    StartTime: slot.StartTime.ToString("HH:mm"),
                    EndTime: slot.EndTime.ToString("HH:mm"),
                    IsPeakHour: isDefaultOrPolicyPeak,
                    Revenue: slotDetails.Sum(x => x.NetRevenue),
                    BookedCount: slotDetails.Count);
            })
            .Where(x => !onlyPeakHours || x.IsPeakHour)
            .ToList();

        return new RevenueReportResponse(
            FacilityId: normalizedFacilityId ?? 0,
            FacilityName: targetFacility?.Name ?? "Tất cả cơ sở",
            From: from,
            To: to,
            TotalRevenue: totalRevenue,
            TotalBookings: totalBookings,
            DailyBreakdown: dailyBreakdown,
            SportId: normalizedSportId,
            SportName: targetSport?.SportName ?? "Tất cả môn thể thao",
            BookingRevenue: bookingRevenue,
            TournamentRevenue: tournamentRevenue,
            SocialRevenue: socialRevenue,
            PeakHourRevenue: peakHourRevenue,
            OffPeakRevenue: offPeakRevenue,
            TotalBookedSlots: totalBookedSlots,
            PeakBookedSlots: peakBookedSlots,
            FacilityBreakdown: facilityBreakdown,
            SportBreakdown: sportBreakdown,
            PeakHourBreakdown: peakHourBreakdown);
    }

    public async Task<OccupancyReportResponse> GetOccupancyReportAsync(
        int? facilityId,
        DateOnly date,
        DateOnly? from = null,
        DateOnly? to = null,
        int? sportId = null,
        bool onlyPeakHours = false)
    {
        var startDate = from ?? date;
        var endDate = to ?? date;
        ValidateDateRange(startDate, endDate);

        var normalizedFacilityId = facilityId.HasValue && facilityId.Value > 0 ? facilityId.Value : (int?)null;
        var normalizedSportId = sportId.HasValue && sportId.Value > 0 ? sportId.Value : (int?)null;

        Facility? targetFacility = null;
        if (normalizedFacilityId.HasValue)
        {
            targetFacility = await uow.Facilities.GetByIdAsync(normalizedFacilityId.Value)
                ?? throw new NotFoundException("Cơ sở", normalizedFacilityId.Value);
        }

        Sport? targetSport = null;
        if (normalizedSportId.HasValue)
        {
            targetSport = await uow.Facilities.GetSportByIdAsync(normalizedSportId.Value)
                ?? throw new NotFoundException("Môn thể thao", normalizedSportId.Value);
        }

        var courts = await uow.Reports.GetActiveCourtsWithRelationsAsync(normalizedFacilityId, normalizedSportId);
        var timeSlots = (await uow.Facilities.GetTimeSlotsAsync()).OrderBy(ts => ts.StartTime).ToList();
        var pricePolicies = await uow.Reports.GetActivePricePoliciesWithRulesAsync(normalizedFacilityId, normalizedSportId);
        var bookingDetails = await uow.Reports.GetConfirmedBookingDetailsAsync(startDate, endDate, normalizedFacilityId, normalizedSportId);
        var socialSessions = await uow.Reports.GetActiveSocialSessionsAsync(startDate, endDate, normalizedFacilityId, normalizedSportId);

        var totalDays = endDate.DayNumber - startDate.DayNumber + 1;

        // Tập hợp các ô sân (CourtId, PlayDate, TimeSlotId) đã được lấp đầy bởi Booking hoặc SocialSession
        var occupiedSlotKeys = new HashSet<(int CourtId, DateOnly PlayDate, int TimeSlotId)>();
        foreach (var bd in bookingDetails)
        {
            occupiedSlotKeys.Add((bd.CourtId, bd.PlayDate, bd.TimeSlotId));
        }

        foreach (var session in socialSessions)
        {
            var matchingSlots = timeSlots.Where(ts => ts.StartTime < session.EndTime && ts.EndTime > session.StartTime).ToList();
            foreach (var sessionCourt in session.SessionCourts)
            {
                foreach (var ts in matchingSlots)
                {
                    occupiedSlotKeys.Add((sessionCourt.CourtId, session.PlayDate, ts.Id));
                }
            }
        }

        // Tính toán lấp đầy cho từng sân (CourtBreakdown)
        var courtBreakdown = new List<CourtOccupancy>();
        int totalSlotsAll = 0;
        int occupiedSlotsAll = 0;
        int peakTotalSlotsAll = 0;
        int peakOccupiedSlotsAll = 0;
        int offPeakTotalSlotsAll = 0;
        int offPeakOccupiedSlotsAll = 0;

        foreach (var court in courts)
        {
            int courtTotal = 0;
            int courtOccupied = 0;
            int courtPeakTotal = 0;
            int courtPeakOccupied = 0;

            foreach (var slot in timeSlots)
            {
                var isPeak = IsPeakHourSlot(pricePolicies, court.FacilityId, court.SportId, slot);
                if (onlyPeakHours && !isPeak)
                    continue;

                var slotCapacityForCourt = totalDays;
                var slotOccupiedForCourt = 0;

                for (var d = startDate; d <= endDate; d = d.AddDays(1))
                {
                    if (occupiedSlotKeys.Contains((court.Id, d, slot.Id)))
                        slotOccupiedForCourt++;
                }

                courtTotal += slotCapacityForCourt;
                courtOccupied += slotOccupiedForCourt;

                if (isPeak)
                {
                    courtPeakTotal += slotCapacityForCourt;
                    courtPeakOccupied += slotOccupiedForCourt;
                    peakTotalSlotsAll += slotCapacityForCourt;
                    peakOccupiedSlotsAll += slotOccupiedForCourt;
                }
                else
                {
                    offPeakTotalSlotsAll += slotCapacityForCourt;
                    offPeakOccupiedSlotsAll += slotOccupiedForCourt;
                }
            }

            totalSlotsAll += courtTotal;
            occupiedSlotsAll += courtOccupied;

            courtBreakdown.Add(new CourtOccupancy(
                CourtId: court.Id,
                CourtName: court.CourtName,
                TotalSlots: courtTotal,
                OccupiedSlots: courtOccupied,
                FacilityId: court.FacilityId,
                FacilityName: court.Facility?.Name ?? string.Empty,
                SportId: court.SportId,
                SportName: court.Sport?.SportName ?? string.Empty,
                OccupancyRate: CalculateRate(courtOccupied, courtTotal),
                PeakTotalSlots: courtPeakTotal,
                PeakOccupiedSlots: courtPeakOccupied,
                PeakOccupancyRate: CalculateRate(courtPeakOccupied, courtPeakTotal)));
        }

        // Thống kê lấp đầy theo Cơ sở (FacilityBreakdown)
        var facilityBreakdown = courtBreakdown
            .GroupBy(c => new { c.FacilityId, c.FacilityName })
            .Select(g =>
            {
                var tot = g.Sum(x => x.TotalSlots);
                var occ = g.Sum(x => x.OccupiedSlots);
                var pkTot = g.Sum(x => x.PeakTotalSlots);
                var pkOcc = g.Sum(x => x.PeakOccupiedSlots);
                return new FacilityOccupancyBreakdown(
                    FacilityId: g.Key.FacilityId,
                    FacilityName: g.Key.FacilityName,
                    ActiveCourtsCount: g.Count(),
                    TotalSlots: tot,
                    OccupiedSlots: occ,
                    OccupancyRate: CalculateRate(occ, tot),
                    PeakTotalSlots: pkTot,
                    PeakOccupiedSlots: pkOcc,
                    PeakOccupancyRate: CalculateRate(pkOcc, pkTot));
            })
            .OrderByDescending(x => x.OccupancyRate)
            .ThenBy(x => x.FacilityId)
            .ToList();

        // Thống kê lấp đầy theo Môn thể thao (SportBreakdown)
        var sportBreakdown = courtBreakdown
            .GroupBy(c => new { c.SportId, c.SportName })
            .Select(g =>
            {
                var tot = g.Sum(x => x.TotalSlots);
                var occ = g.Sum(x => x.OccupiedSlots);
                var pkTot = g.Sum(x => x.PeakTotalSlots);
                var pkOcc = g.Sum(x => x.PeakOccupiedSlots);
                return new SportOccupancyBreakdown(
                    SportId: g.Key.SportId,
                    SportName: g.Key.SportName,
                    ActiveCourtsCount: g.Count(),
                    TotalSlots: tot,
                    OccupiedSlots: occ,
                    OccupancyRate: CalculateRate(occ, tot),
                    PeakTotalSlots: pkTot,
                    PeakOccupiedSlots: pkOcc,
                    PeakOccupancyRate: CalculateRate(pkOcc, pkTot));
            })
            .OrderByDescending(x => x.OccupancyRate)
            .ThenBy(x => x.SportId)
            .ToList();

        // Thống kê lấp đầy theo Khung giờ / Giờ vàng (HourlyBreakdown)
        var hourlyBreakdown = new List<TimeSlotOccupancyBreakdown>();
        foreach (var slot in timeSlots)
        {
            var isPeak = IsPeakHourSlot(
                pricePolicies,
                normalizedFacilityId ?? courts.FirstOrDefault()?.FacilityId ?? 1,
                normalizedSportId ?? courts.FirstOrDefault()?.SportId ?? 1,
                slot);

            if (onlyPeakHours && !isPeak)
                continue;

            var slotTotal = courts.Count * totalDays;
            var slotOccupied = 0;
            foreach (var court in courts)
            {
                for (var d = startDate; d <= endDate; d = d.AddDays(1))
                {
                    if (occupiedSlotKeys.Contains((court.Id, d, slot.Id)))
                        slotOccupied++;
                }
            }

            hourlyBreakdown.Add(new TimeSlotOccupancyBreakdown(
                TimeSlotId: slot.Id,
                StartTime: slot.StartTime.ToString("HH:mm"),
                EndTime: slot.EndTime.ToString("HH:mm"),
                IsPeakHour: isPeak,
                TotalSlots: slotTotal,
                OccupiedSlots: slotOccupied,
                OccupancyRate: CalculateRate(slotOccupied, slotTotal)));
        }

        return new OccupancyReportResponse(
            FacilityId: normalizedFacilityId ?? 0,
            Date: endDate,
            TotalSlots: totalSlotsAll,
            OccupiedSlots: occupiedSlotsAll,
            OccupancyRate: CalculateRate(occupiedSlotsAll, totalSlotsAll),
            CourtBreakdown: courtBreakdown,
            FacilityName: targetFacility?.Name ?? "Tất cả cơ sở",
            From: startDate,
            To: endDate,
            SportId: normalizedSportId,
            SportName: targetSport?.SportName ?? "Tất cả môn thể thao",
            PeakTotalSlots: peakTotalSlotsAll,
            PeakOccupiedSlots: peakOccupiedSlotsAll,
            PeakOccupancyRate: CalculateRate(peakOccupiedSlotsAll, peakTotalSlotsAll),
            OffPeakTotalSlots: offPeakTotalSlotsAll,
            OffPeakOccupiedSlots: offPeakOccupiedSlotsAll,
            OffPeakOccupancyRate: CalculateRate(offPeakOccupiedSlotsAll, offPeakTotalSlotsAll),
            FacilityBreakdown: facilityBreakdown,
            SportBreakdown: sportBreakdown,
            HourlyBreakdown: hourlyBreakdown);
    }

    public async Task<DashboardAnalyticsResponse> GetDashboardAnalyticsAsync(
        int? facilityId,
        DateOnly from,
        DateOnly to,
        int? sportId = null,
        bool onlyPeakHours = false)
    {
        var revenue = await GetRevenueReportAsync(facilityId, from, to, sportId, onlyPeakHours);
        var occupancy = await GetOccupancyReportAsync(facilityId, to, from, to, sportId, onlyPeakHours);
        return new DashboardAnalyticsResponse(revenue, occupancy);
    }

    private static void ValidateDateRange(DateOnly from, DateOnly to)
    {
        if (from > to)
            throw new ValidationException(["Ngày bắt đầu không được lớn hơn ngày kết thúc."]);

        if (to.DayNumber - from.DayNumber > 366)
            throw new ValidationException(["Khoảng thời gian truy vấn báo cáo không được vượt quá 366 ngày."]);
    }

    private static bool IsPeakHourSlot(
        IReadOnlyCollection<PricePolicy> policies,
        int facilityId,
        int sportId,
        TimeSlot slot)
    {
        var policy = policies.FirstOrDefault(p => p.FacilityId == facilityId && p.SportId == sportId);
        var rule = policy?.PriceRuleDetails.FirstOrDefault(r => r.TimeSlotId == slot.Id);
        if (rule is not null)
            return rule.IsPeakHour;

        return slot.IsDefaultPeak || (slot.StartTime.Hour >= 17 && slot.StartTime.Hour < 21);
    }

    private static double CalculateRate(int occupied, int total)
        => total <= 0 ? 0 : Math.Round((double)occupied * 100.0 / total, 2);
}
