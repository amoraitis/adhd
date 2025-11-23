using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringPrioritiesWithCron : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RecurringPriorityId",
                table: "Priorities",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecurringPriorities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CronExpression = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Importance = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringPriorities", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Priorities_RecurringPriorityId",
                table: "Priorities",
                column: "RecurringPriorityId");

            migrationBuilder.AddForeignKey(
                name: "FK_Priorities_RecurringPriorities_RecurringPriorityId",
                table: "Priorities",
                column: "RecurringPriorityId",
                principalTable: "RecurringPriorities",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Priorities_RecurringPriorities_RecurringPriorityId",
                table: "Priorities");

            migrationBuilder.DropTable(
                name: "RecurringPriorities");

            migrationBuilder.DropIndex(
                name: "IX_Priorities_RecurringPriorityId",
                table: "Priorities");

            migrationBuilder.DropColumn(
                name: "RecurringPriorityId",
                table: "Priorities");
        }
    }
}
