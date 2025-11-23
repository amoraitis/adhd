namespace Api.Models;

public class RecurringPriority
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string CronExpression { get; set; } // Standard cron expression (e.g., "0 0 * * 1-5" for weekdays)
    public bool IsActive { get; set; } = true;
    public int Importance { get; set; } // 1 = most important, 2 = second, 3 = third (suggested)
    public DateTime CreatedAt { get; set; }
}
