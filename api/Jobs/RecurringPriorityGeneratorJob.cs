using Api.Data;
using Api.Models;
using Cronos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Api.Jobs;

public class RecurringPriorityGeneratorJob
{
    private readonly AppDbContext _db;
    private readonly ILogger<RecurringPriorityGeneratorJob> _logger;
    private readonly AppSettings _appSettings;

    public RecurringPriorityGeneratorJob(AppDbContext db, ILogger<RecurringPriorityGeneratorJob> logger, IOptions<AppSettings> appSettings)
    {
        _db = db;
        _logger = logger;
        _appSettings = appSettings.Value;
    }

    public async Task Execute(string dateString)
    {
        if (!DateOnly.TryParse(dateString, out var targetDate))
        {
            _logger.LogError("Invalid date format: {DateString}", dateString);
            return;
        }

        _logger.LogInformation("Generating recurring priorities for {Date}", targetDate);

        // Get all active recurring priorities
        var recurringPriorities = await _db.RecurringPriorities
            .Where(rp => rp.IsActive)
            .ToListAsync();

        var matchingPriorities = recurringPriorities.Where(rp => ShouldGenerateForDate(rp, targetDate)).ToList();

        if (!matchingPriorities.Any())
        {
            _logger.LogInformation("No recurring priorities to generate for {Date}", targetDate);
            return;
        }

        // Get or create the daily entry for this date
        var dailyEntry = await _db.DailyEntries
            .Include(d => d.Priorities)
            .FirstOrDefaultAsync(d => d.Date == targetDate);

        if (dailyEntry == null)
        {
            dailyEntry = new DailyEntry { Date = targetDate };
            _db.DailyEntries.Add(dailyEntry);
            await _db.SaveChangesAsync();
        }

        // Check if priorities already exist from this template (avoid duplicates)
        var existingRecurringPriorityIds = dailyEntry.Priorities
            .Where(p => p.RecurringPriorityId.HasValue)
            .Select(p => p.RecurringPriorityId!.Value)
            .ToHashSet();

        // Generate priorities from templates
        foreach (var template in matchingPriorities)
        {
            if (existingRecurringPriorityIds.Contains(template.Id))
            {
                _logger.LogDebug("Priority from template {TemplateId} already exists for {Date}", template.Id, targetDate);
                continue;
            }

            var priority = new Priority
            {
                Name = template.Name,
                Done = false,
                DailyEntryId = dailyEntry.Id,
                Importance = template.Importance,
                RecurringPriorityId = template.Id
            };

            dailyEntry.Priorities.Add(priority);
            _logger.LogInformation("Generated priority '{Name}' from template {TemplateId} for {Date}", 
                template.Name, template.Id, targetDate);
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Generated {Count} recurring priorities for {Date}", 
            matchingPriorities.Count - existingRecurringPriorityIds.Count, targetDate);
    }

    private bool ShouldGenerateForDate(RecurringPriority template, DateOnly targetDate)
    {
        try
        {
            // Parse the cron expression
            var cronExpression = CronExpression.Parse(template.CronExpression, CronFormat.Standard);
            
            // Check if the cron expression matches the target date
            // We check at midnight of the target date
            // Determine timezone from app settings (fallback to UTC)
            var tz = TimeZoneInfo.Utc;
            if (!string.IsNullOrWhiteSpace(_appSettings.Timezone))
            {
                try
                {
                    tz = TimeZoneInfo.FindSystemTimeZoneById(_appSettings.Timezone);
                }
                catch (TimeZoneNotFoundException ex)
                {
                    _logger.LogWarning(ex, "Timezone '{TimeZoneInfo}' not found; falling back to UTC", _appSettings.Timezone);
                }
                catch (InvalidTimeZoneException ex)
                {
                    _logger.LogWarning(ex, "Invalid timezone '{TimeZoneInfo}'; falling back to UTC", _appSettings.Timezone);
                }
            }

            // Use the start of the target date in the configured timezone as the base time
            // Ensure the DateTime.Kind is Utc as required by Cronos/TimeZoneInfo conversions
            var baseTime = targetDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            // Get the next occurrence after the base time in the configured timezone
            // Interpret midnight of the target date in the configured timezone, convert to UTC,
            // then ask Cronos for the next occurrence (inclusive) starting from that UTC base time.
            var localMidnight = targetDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
            var baseTimeUtc = TimeZoneInfo.ConvertTimeToUtc(localMidnight, tz);
            var nextOccurrence = cronExpression.GetNextOccurrence(baseTimeUtc, tz, true);

            if (nextOccurrence.HasValue)
            {
                // Normalize the occurrence to the configured timezone and compare dates
                var occurrenceInTz = TimeZoneInfo.ConvertTime(nextOccurrence.Value, tz);
                var occurrenceDate = DateOnly.FromDateTime(occurrenceInTz);
                return occurrenceDate == targetDate;
            }
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Invalid cron expression for template {TemplateId}: {CronExpression}", 
                template.Id, template.CronExpression);
            return false;
        }
    }
}
