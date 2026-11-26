using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class VnPayPaymentAndRefundFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentUrl",
                table: "PaymentTransactions",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProviderTransactionDate",
                table: "PaymentTransactions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderTransactionId",
                table: "PaymentTransactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedTransactionId",
                table: "PaymentTransactions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionType",
                table: "PaymentTransactions",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "Payment");

            migrationBuilder.AddColumn<string>(
                name: "RefundFailureReason",
                table: "BookingCancellations",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundStatus",
                table: "BookingCancellations",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "NotRequired");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_RelatedTransactionId",
                table: "PaymentTransactions",
                column: "RelatedTransactionId",
                unique: true,
                filter: "[RelatedTransactionId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_PaymentTransactions_RelatedTransactionId",
                table: "PaymentTransactions",
                column: "RelatedTransactionId",
                principalTable: "PaymentTransactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_PaymentTransactions_RelatedTransactionId",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_RelatedTransactionId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "PaymentUrl",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "ProviderTransactionDate",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "ProviderTransactionId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "RelatedTransactionId",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "TransactionType",
                table: "PaymentTransactions");

            migrationBuilder.DropColumn(
                name: "RefundFailureReason",
                table: "BookingCancellations");

            migrationBuilder.DropColumn(
                name: "RefundStatus",
                table: "BookingCancellations");
        }
    }
}
