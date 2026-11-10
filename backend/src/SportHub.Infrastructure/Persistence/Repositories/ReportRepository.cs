using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces.Repositories;
using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Social;
using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Enums;

namespace SportHub.Infrastructure.Persistence.Repositories;

public class ReportRepository(SportHubDbContext context) : IReportRepository
{
    public async Task<List<Facility>> GetActiveFacilitiesAsync(int? facilityId = null)
    {
        var query = context.Facilities.AsNoTracking().Where(f => f.IsActive);
        if (facilityId.HasValue && facilityId.Value > 0)
            query = query.Where(f => f.Id == facilityId.Value);

        return await query.OrderBy(f => f.Id).ToListAsync();
    }

    public async Task<List<Sport>> GetActiveSportsAsync(int? sportId = null)
    {
        var query = context.Sports.AsNoTracking().Where(s => s.IsActive);
        if (sportId.HasValue && sportId.Value > 0)
            query = query.Where(s => s.Id == sportId.Value);

        return await query.OrderBy(s => s.Id).ToListAsync();
    }

    public async Task<List<Court>> GetActiveCourtsWithRelationsAsync(int? facilityId = null, int? sportId = null)
    {
        var query = context.Courts
            .AsNoTracking()
            .Include(c => c.Facility)
            .Include(c => c.Sport)
            .Where(c => c.IsActive && c.Facility.IsActive && c.Sport.IsActive);

        if (facilityId.HasValue && facilityId.Value > 0)
            query = query.Where(c => c.FacilityId == facilityId.Value);

        if (sportId.HasValue && sportId.Value > 0)
            query = query.Where(c => c.SportId == sportId.Value);

        return await query
            .OrderBy(c => c.FacilityId)
            .ThenBy(c => c.SportId)
            .ThenBy(c => c.Id)
            .ToListAsync();
    }

    public async Task<List<PricePolicy>> GetActivePricePoliciesWithRulesAsync(int? facilityId = null, int? sportId = null)
    {
        var query = context.PricePolicies
            .AsNoTracking()
            .Include(p => p.PriceRuleDetails)
            .Where(p => p.IsActive);

        if (facilityId.HasValue && facilityId.Value > 0)
            query = query.Where(p => p.FacilityId == facilityId.Value);

        if (sportId.HasValue && sportId.Value > 0)
            query = query.Where(p => p.SportId == sportId.Value);

        return await query
            .OrderByDescending(p => p.EffectiveFrom)
            .ToListAsync();
    }

    public async Task<List<BookingDetail>> GetConfirmedBookingDetailsAsync(
        DateOnly from,
        DateOnly to,
        int? facilityId = null,
        int? sportId = null)
    {
        var query = context.BookingDetails
            .AsNoTracking()
            .Include(bd => bd.Booking)
            .Include(bd => bd.TimeSlot)
            .Include(bd => bd.Court).ThenInclude(c => c.Facility)
            .Include(bd => bd.Court).ThenInclude(c => c.Sport)
            .Where(bd =>
                bd.PlayDate >= from &&
                bd.PlayDate <= to &&
                (bd.Booking.BookingStatus == BookingStatus.Confirmed ||
                 bd.Booking.BookingStatus == BookingStatus.Completed));

        if (facilityId.HasValue && facilityId.Value > 0)
            query = query.Where(bd => bd.Court.FacilityId == facilityId.Value);

        if (sportId.HasValue && sportId.Value > 0)
            query = query.Where(bd => bd.Court.SportId == sportId.Value);

        return await query.ToListAsync();
    }

    public async Task<List<SocialSession>> GetActiveSocialSessionsAsync(
        DateOnly from,
        DateOnly to,
        int? facilityId = null,
        int? sportId = null)
    {
        var query = context.SocialSessions
            .AsNoTracking()
            .Include(s => s.Facility)
            .Include(s => s.Sport)
            .Include(s => s.SessionCourts).ThenInclude(sc => sc.Court)
            .Include(s => s.Participants)
            .Where(s =>
                s.PlayDate >= from &&
                s.PlayDate <= to &&
                s.Status != "Cancelled");

        if (facilityId.HasValue && facilityId.Value > 0)
            query = query.Where(s => s.FacilityId == facilityId.Value);

        if (sportId.HasValue && sportId.Value > 0)
            query = query.Where(s => s.SportId == sportId.Value);

        return await query.ToListAsync();
    }

    public async Task<List<Tournament>> GetTournamentsInRangeAsync(
        DateOnly from,
        DateOnly to,
        int? facilityId = null,
        int? sportId = null)
    {
        var query = context.Tournaments
            .AsNoTracking()
            .Include(t => t.Facility)
            .Include(t => t.Sport)
            .Include(t => t.Teams)
            .Where(t =>
                t.StartDate <= to &&
                t.EndDate >= from &&
                t.Status != "Draft");

        if (facilityId.HasValue && facilityId.Value > 0)
            query = query.Where(t => t.FacilityId == facilityId.Value);

        if (sportId.HasValue && sportId.Value > 0)
            query = query.Where(t => t.SportId == sportId.Value);

        return await query.ToListAsync();
    }

    public async Task<List<PaymentTransaction>> GetConfirmedTournamentPaymentsAsync(
        IReadOnlyCollection<int> tournamentTeamIds)
    {
        if (tournamentTeamIds.Count == 0)
            return [];

        return await context.PaymentTransactions
            .AsNoTracking()
            .Where(pt =>
                pt.TournamentTeamId.HasValue &&
                tournamentTeamIds.Contains(pt.TournamentTeamId.Value) &&
                pt.TransactionType == PaymentTransactionType.Payment &&
                pt.Status == PaymentStatus.Confirmed)
            .ToListAsync();
    }
}
