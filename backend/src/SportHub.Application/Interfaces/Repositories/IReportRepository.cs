using SportHub.Domain.Entities.Booking;
using SportHub.Domain.Entities.Facility;
using SportHub.Domain.Entities.Payment;
using SportHub.Domain.Entities.Social;
using SportHub.Domain.Entities.Tournament;

namespace SportHub.Application.Interfaces.Repositories;

public interface IReportRepository
{
    Task<List<Facility>> GetActiveFacilitiesAsync(int? facilityId = null);
    Task<List<Sport>> GetActiveSportsAsync(int? sportId = null);
    Task<List<Court>> GetActiveCourtsWithRelationsAsync(int? facilityId = null, int? sportId = null);
    Task<List<PricePolicy>> GetActivePricePoliciesWithRulesAsync(int? facilityId = null, int? sportId = null);
    Task<List<BookingDetail>> GetConfirmedBookingDetailsAsync(DateOnly from, DateOnly to, int? facilityId = null, int? sportId = null);
    Task<List<SocialSession>> GetActiveSocialSessionsAsync(DateOnly from, DateOnly to, int? facilityId = null, int? sportId = null);
    Task<List<Tournament>> GetTournamentsInRangeAsync(DateOnly from, DateOnly to, int? facilityId = null, int? sportId = null);
    Task<List<PaymentTransaction>> GetConfirmedTournamentPaymentsAsync(IReadOnlyCollection<int> tournamentTeamIds);
}
