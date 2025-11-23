using Api.Data;
using Api.Models;
using Api.Jobs;
using Hangfire;
using Microsoft.EntityFrameworkCore;

public static class EndpointsExtensions
{
    public static WebApplication MapApiEndpoints(this WebApplication app)
    {
        // Goals endpoints
        app.MapGet("/api/goals", async (AppDbContext db) =>
        {
            return await db.Goals.Include(g => g.Steps).ToListAsync();
        });

        app.MapGet("/api/goals/{id}", async (int id, AppDbContext db) =>
        {
            var goal = await db.Goals.Include(g => g.Steps).FirstOrDefaultAsync(g => g.Id == id);
            return goal is not null ? Results.Ok(goal) : Results.NotFound();
        });

        app.MapPost("/api/goals", async (Goal goal, AppDbContext db) =>
        {
            goal.Created = DateTime.UtcNow;
            db.Goals.Add(goal);
            await db.SaveChangesAsync();
            return Results.Created($"/api/goals/{goal.Id}", goal);
        });

        app.MapPut("/api/goals/{id}", async (int id, Goal updatedGoal, AppDbContext db) =>
        {
            var goal = await db.Goals.Include(g => g.Steps).FirstOrDefaultAsync(g => g.Id == id);
            if (goal is null) return Results.NotFound();

            goal.Title = updatedGoal.Title;
            goal.Type = updatedGoal.Type;

            // Update steps
            db.Steps.RemoveRange(goal.Steps);
            goal.Steps = updatedGoal.Steps;

            await db.SaveChangesAsync();
            return Results.Ok(goal);
        });

        app.MapDelete("/api/goals/{id}", async (int id, AppDbContext db) =>
        {
            var goal = await db.Goals.FindAsync(id);
            if (goal is null) return Results.NotFound();

            db.Goals.Remove(goal);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Steps endpoints
        app.MapPut("/api/steps/{id}", async (int id, Step updatedStep, AppDbContext db) =>
        {
            var step = await db.Steps.FindAsync(id);
            if (step is null) return Results.NotFound();

            step.Text = updatedStep.Text;
            step.Done = updatedStep.Done;

            await db.SaveChangesAsync();
            return Results.Ok(step);
        });

        // Daily entries endpoints
        app.MapGet("/api/daily/{date}", async (string date, AppDbContext db) =>
        {
            if (!DateOnly.TryParse(date, out var parsedDate))
                return Results.BadRequest("Invalid date format");

            var entry = await db.DailyEntries
                .Include(d => d.Priorities.OrderBy(p => p.Importance))
                .FirstOrDefaultAsync(d => d.Date == parsedDate);
            return entry is not null ? Results.Ok(entry) : Results.NotFound();
        });

        app.MapPost("/api/daily", async (DailyEntry entry, AppDbContext db) =>
        {
            var existing = await db.DailyEntries
                .Include(d => d.Priorities)
                .FirstOrDefaultAsync(d => d.Date == entry.Date);

            if (existing is not null)
            {
                // Update existing entry
                existing.BrainDump = entry.BrainDump;
                existing.Worries = entry.Worries;
                existing.WorryTime = entry.WorryTime;
                existing.Gratitude = entry.Gratitude;

                // Update priorities intelligently - update existing ones, add new ones, remove deleted ones
                foreach (var incomingPriority in entry.Priorities)
                {
                    var existingPriority = existing.Priorities
                        .FirstOrDefault(p => p.Importance == incomingPriority.Importance);

                    if (existingPriority != null)
                    {
                        // Update existing priority
                        existingPriority.Name = incomingPriority.Name;
                        existingPriority.Done = incomingPriority.Done;
                    }
                    else if (!string.IsNullOrWhiteSpace(incomingPriority.Name))
                    {
                        // Add new priority
                        existing.Priorities.Add(new Priority
                        {
                            Name = incomingPriority.Name,
                            Done = incomingPriority.Done,
                            Importance = incomingPriority.Importance,
                            DailyEntryId = existing.Id
                        });
                    }
                }

                // Remove priorities that are no longer present (empty names)
                var prioritiesToRemove = existing.Priorities
                    .Where(p => !entry.Priorities.Any(ip => ip.Importance == p.Importance && !string.IsNullOrWhiteSpace(ip.Name)))
                    .ToList();

                foreach (var priorityToRemove in prioritiesToRemove)
                {
                    existing.Priorities.Remove(priorityToRemove);
                    db.Priorities.Remove(priorityToRemove);
                }

                await db.SaveChangesAsync();

                // Schedule or update worry time reminder
                ScheduleWorryTimeReminder(existing);

                return Results.Ok(existing);
            }

            db.DailyEntries.Add(entry);
            await db.SaveChangesAsync();

            // Schedule worry time reminder for new entry
            ScheduleWorryTimeReminder(entry);

            return Results.Created($"/api/daily/{entry.Date}", entry);
        });

        // Move priority to next available day
        app.MapPost("/api/priorities/{priorityId}/move-to-next-day", async (int priorityId, AppDbContext db) =>
        {
            var priority = await db.Priorities
                .Include(p => p.DailyEntry)
                .FirstOrDefaultAsync(p => p.Id == priorityId);

            if (priority is null || priority.DailyEntry is null) return Results.NotFound();
            if (priority.Done) return Results.BadRequest("Cannot move completed priorities");

            var currentDate = priority.DailyEntry.Date;

            // Find the next day with less than 3 priorities
            var nextAvailableDate = currentDate;
            for (int i = 1; i <= 365; i++) // Search up to a year ahead
            {
                nextAvailableDate = currentDate.AddDays(i);

                var priorityCount = await db.Priorities
                    .Include(p => p.DailyEntry)
                    .Where(p => p.DailyEntry != null && p.DailyEntry.Date == nextAvailableDate)
                    .CountAsync();

                if (priorityCount < 3)
                {
                    // Found a day with available slots
                    var targetEntry = await db.DailyEntries
                        .Include(d => d.Priorities)
                        .FirstOrDefaultAsync(d => d.Date == nextAvailableDate);

                    if (targetEntry is null)
                    {
                        // Create new daily entry for that date
                        targetEntry = new DailyEntry
                        {
                            Date = nextAvailableDate,
                            Priorities = new List<Priority>()
                        };
                        db.DailyEntries.Add(targetEntry);
                        await db.SaveChangesAsync(); // Save to get the ID
                    }

                    // Determine the importance for the new priority
                    var existingImportances = targetEntry.Priorities.Select(p => p.Importance).ToList();
                    int newImportance = 1;
                    while (existingImportances.Contains(newImportance))
                    {
                        newImportance++;
                    }

                    // Update the priority to point to the new daily entry
                    priority.DailyEntryId = targetEntry.Id;
                    priority.Importance = newImportance;
                    priority.Done = false; // Reset done status when moving

                    await db.SaveChangesAsync();

                    return Results.Ok(new
                    {
                        success = true,
                        movedToDate = nextAvailableDate.ToString("yyyy-MM-dd"),
                        priority
                    });
                }
            }

            return Results.BadRequest("No available day found within the next year");
        });

        return app;
    }

    private static void ScheduleWorryTimeReminder(DailyEntry entry)
    {
        try
        {
            // Only schedule if there are worries
            if (string.IsNullOrWhiteSpace(entry.Worries))
            {
                // Remove any existing job for this entry
                BackgroundJob.Delete($"worry-reminder-{entry.Id}");
                return;
            }
            // Get worry time or default to 7 PM
            var worryTime = entry.WorryTime ?? new TimeOnly(19, 0);
            var worryTimeString = worryTime.ToString("HH:mm");

            // Combine entry date with worry time
            var reminderDateTime = entry.Date.ToDateTime(worryTime);

            // Only schedule if the reminder is in the future
            if (reminderDateTime <= DateTime.Now)
            {
                BackgroundJob.Delete($"worry-reminder-{entry.Id}");
                return;
            }

            // Schedule the one-time job
            var jobId = BackgroundJob.Schedule<WorryTimeReminderJob>(
                job => job.Execute(entry.Id, entry.Date.ToString("yyyy-MM-dd"), worryTimeString),
                reminderDateTime - DateTime.Now
            );
        }
        catch { }
        ;
    }
}