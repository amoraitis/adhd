using Api.Services;
using Hangfire;

namespace Api.Jobs;

public class WorryTimeReminderJob
{
    private readonly INotificationService _notificationService;

    public WorryTimeReminderJob(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    public async Task Execute(int dailyEntryId, string date, string worryTime)
    {
        await _notificationService.SendWorryTimeNotification(dailyEntryId, date, worryTime);
    }
}
