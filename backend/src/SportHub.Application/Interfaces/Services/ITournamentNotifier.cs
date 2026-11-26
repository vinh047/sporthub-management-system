using SportHub.Application.DTOs.Tournament;

namespace SportHub.Application.Interfaces.Services;

public interface ITournamentNotifier
{
    Task BracketUpdatedAsync(TournamentBracketDto bracket);
}
