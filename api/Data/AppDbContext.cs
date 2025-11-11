using Microsoft.EntityFrameworkCore;
using Api.Models;

namespace Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Step> Steps => Set<Step>();
    public DbSet<DailyEntry> DailyEntries => Set<DailyEntry>();
    public DbSet<Priority> Priorities => Set<Priority>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Goal>()
            .HasMany(g => g.Steps)
            .WithOne(s => s.Goal)
            .HasForeignKey(s => s.GoalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DailyEntry>()
            .HasIndex(d => d.Date)
            .IsUnique();

        modelBuilder.Entity<DailyEntry>()
            .HasMany(d => d.Priorities)
            .WithOne(p => p.DailyEntry)
            .HasForeignKey(p => p.DailyEntryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
