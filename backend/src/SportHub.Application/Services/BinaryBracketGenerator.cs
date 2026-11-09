using SportHub.Domain.Entities.Tournament;
using SportHub.Domain.Exceptions;

namespace SportHub.Application.Services;

public static class BinaryBracketGenerator
{
    // Ordered entrants are seeds: 1 and 2 occupy opposite halves of the tree.
    public static List<TournamentMatch> Generate(int tournamentId, IReadOnlyList<int> teamIds)
    {
        if (teamIds.Count is < 2 or > 64 || teamIds.Distinct().Count() != teamIds.Count)
            throw new ValidationException(["Nhánh đấu cần từ 2 đến 64 đội khác nhau."]);
        var size = 2;
        while (size < teamIds.Count) size *= 2;
        var seeds = new List<int> { 1, 2 };
        while (seeds.Count < size)
        {
            var complement = seeds.Count * 2 + 1;
            seeds = seeds.SelectMany(seed => new[] { seed, complement - seed }).ToList();
        }
        var matches = new List<TournamentMatch>();
        for (int round = 1, count = size / 2; count >= 1; round++, count /= 2)
            for (var order = 1; order <= count; order++)
                matches.Add(new TournamentMatch { TournamentId = tournamentId, RoundNumber = round, MatchOrder = order });
        foreach (var match in matches.Where(m => m.RoundNumber == 1))
        {
            match.Team1Id = TeamAt((match.MatchOrder - 1) * 2);
            match.Team2Id = TeamAt((match.MatchOrder - 1) * 2 + 1);
            if (match.Team1Id is null || match.Team2Id is null)
            {
                match.WinnerTeamId = match.Team1Id ?? match.Team2Id;
                match.Status = "Walkover";
                Advance(matches, match);
            }
        }
        return matches;

        int? TeamAt(int slot) => seeds[slot] <= teamIds.Count ? teamIds[seeds[slot] - 1] : null;
    }

    public static void Advance(ICollection<TournamentMatch> matches, TournamentMatch match)
    {
        var parent = matches.SingleOrDefault(m => m.RoundNumber == match.RoundNumber + 1
            && m.MatchOrder == (match.MatchOrder + 1) / 2);
        if (parent is null) return;
        if (match.MatchOrder % 2 == 1) parent.Team1Id = match.WinnerTeamId;
        else parent.Team2Id = match.WinnerTeamId;
    }
}
