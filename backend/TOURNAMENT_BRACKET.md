# Tournament bracket (UC20, UC21, UC28)

## Setup

Run from the repository root before starting the updated API:

```powershell
dotnet ef database update --project backend/src/SportHub.Infrastructure --startup-project backend/src/SportHub.API
```

Migration `TournamentLiveBracket` adds `Tournaments.BracketVersion`, the `TournamentMatchSet` table (including recorder and UTC timestamp), and a unique tournament/round/order index. The local database used during implementation has been migrated. Other developers/deployments must apply it too.

## Staff workflow

1. Open Staff/Admin → tournaments → view teams. The live-bracket panel is above the roster.
2. Select **Sinh nhánh đấu** and confirm. The tournament must be `SingleElimination` and `OpenReg`, with 2–64 approved, paid teams (free-entry teams need no payment). Unpaid registrations and disqualified teams are excluded. A registered team with a pending/confirmed payment blocks generation until reconciliation, preventing collection during bracket finalization.
3. Seeds use existing seed order, then registration time and team ID. No random draw is performed. Slots expand to the next power of two. High seeds receive first-round BYEs, and seeds 1/2 occupy opposite halves. The generated bracket cannot be overwritten.
4. Enter each **finished set** in order. The current implementation is best-of-three for all sports: first to two sets wins. The referee applies the sport's point/advantage rules; the API validates integer, nonnegative, non-tied results (maximum 999). It does not infer badminton/pickleball scoring rules.
5. Each saved set broadcasts a snapshot. Two set wins complete the match and populate the appropriate slot in its parent. The final completes the tournament and identifies the champion.

The existing `STAFF` role is used for staff/referees, limited to their managed facility; `ADMIN` can manage all facilities. There is no new referee account role. Finalized sets cannot be edited, and completed results cannot be reset through these APIs; a correction workflow with downstream rollback is outside this implementation.

## API / realtime

- `GET /api/tournaments/{id}/bracket`: public read-only snapshot.
- `POST /api/tournaments/{id}/bracket`: authenticated generation.
- `PUT /api/tournaments/{id}/bracket/matches/{matchId}/sets/{setNumber}`: authenticated score entry with `team1Points`, `team2Points`, `expectedVersion`.
- `/hubs/tournaments`: public viewer hub; `JoinTournamentGroup(id)` / `LeaveTournamentGroup(id)`.
- `BracketUpdated`: complete `TournamentBracketDto`, including monotonically increasing `version`.

Mutations commit before broadcast. Repeating an identical recorded set is idempotent. A stale version or concurrent conflicting score returns HTTP 409; clients reload instead of overwriting. Database concurrency tokens and unique keys protect competing requests. Broadcast failures are logged without rolling back committed scores. Clients rejoin/refetch after reconnect and periodically refresh to recover missed broadcasts.

See `TournamentBracket.http` for requests. Unit/service tests cover every bracket size 2–64, BYEs, set progression, champion, duplicate requests, stale versions, permissions and invalid generation. Browser validation also exercised two viewers against SQL Server and SignalR on a temporary local API instance.
