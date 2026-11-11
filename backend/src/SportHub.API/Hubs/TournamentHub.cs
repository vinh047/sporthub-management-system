using Microsoft.AspNetCore.SignalR;
using SportHub.Application.Interfaces.Services;

namespace SportHub.API.Hubs;

public class TournamentHub(ITournamentBracketService brackets) : Hub
{
    public async Task JoinTournamentGroup(int tournamentId)
    {
        if (tournamentId <= 0) throw new HubException("Mã giải đấu không hợp lệ.");
        await brackets.GetAsync(tournamentId);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tournament-{tournamentId}");
    }

    public Task LeaveTournamentGroup(int tournamentId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"tournament-{tournamentId}");
}
