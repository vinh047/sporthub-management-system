using Microsoft.AspNetCore.SignalR;
using SportHub.Application.DTOs.Tournament;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Hubs;

public class SignalRTournamentNotifier(IHubContext<TournamentHub> hub, ILogger<SignalRTournamentNotifier> logger) : ITournamentNotifier
{
    public async Task BracketUpdatedAsync(TournamentBracketDto bracket)
    {
        try
        {
            await hub.Clients.Group($"tournament-{bracket.TournamentId}").SendAsync("BracketUpdated", bracket);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not broadcast tournament {TournamentId} version {Version}.", bracket.TournamentId, bracket.Version);
        }
    }
}
