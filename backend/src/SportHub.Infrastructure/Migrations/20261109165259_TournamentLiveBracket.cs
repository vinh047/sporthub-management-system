using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TournamentLiveBracket : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TournamentMatches_TournamentId",
                table: "TournamentMatches");

            migrationBuilder.AddColumn<long>(
                name: "BracketVersion",
                table: "Tournaments",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.CreateTable(
                name: "TournamentMatchSet",
                columns: table => new
                {
                    MatchId = table.Column<int>(type: "int", nullable: false),
                    SetNumber = table.Column<int>(type: "int", nullable: false),
                    Team1Points = table.Column<int>(type: "int", nullable: false),
                    Team2Points = table.Column<int>(type: "int", nullable: false),
                    RecordedByUserId = table.Column<int>(type: "int", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TournamentMatchSet", x => new { x.MatchId, x.SetNumber });
                    table.ForeignKey(
                        name: "FK_TournamentMatchSet_TournamentMatches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "TournamentMatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TournamentMatches_TournamentId_RoundNumber_MatchOrder",
                table: "TournamentMatches",
                columns: new[] { "TournamentId", "RoundNumber", "MatchOrder" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TournamentMatchSet");

            migrationBuilder.DropIndex(
                name: "IX_TournamentMatches_TournamentId_RoundNumber_MatchOrder",
                table: "TournamentMatches");

            migrationBuilder.DropColumn(
                name: "BracketVersion",
                table: "Tournaments");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentMatches_TournamentId",
                table: "TournamentMatches",
                column: "TournamentId");
        }
    }
}
