namespace Api.Services;

public interface INotificationService
{
    Task SendWorryTimeNotification(int dailyEntryId, string date, string worryTime);
}

public class NotificationService : INotificationService
{
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger;
    }

    public async Task SendWorryTimeNotification(int dailyEntryId, string date, string worryTime)
    {
        // TODO: Implement actual notification (email, push, SMS, etc.)
        _logger.LogInformation(
            "Worry time notification triggered for daily entry {DailyEntryId} on {Date} at {WorryTime}",
            dailyEntryId, date, worryTime);

        // Placeholder for notification implementation
        // Examples:
        // - Send push notification via Firebase/OneSignal
        // - Send email via SendGrid/SMTP
        // - Send SMS via Twilio
        // - Trigger browser notification via SignalR
        
        await Task.CompletedTask;
    }
}
