using Api.Data;
using Api.Jobs;
using Api.Models;
using Cronos;
using Hangfire;
using Microsoft.EntityFrameworkCore;

namespace Api.Extensions;

public static class RecurringPrioritiesEndpoints
{
    public static WebApplication MapRecurringPrioritiesEndpoints(this WebApplication app)
    {
        // Get all recurring priority templates
        app.MapGet("/api/recurring-priorities", async (AppDbContext db) =>
        {
            var templates = await db.RecurringPriorities
                .AsNoTracking()
                .OrderBy(rp => rp.Importance)
                .ThenBy(rp => rp.Name)
                .ToListAsync();
            return Results.Ok(templates);
        });

        // Get a specific recurring priority template
        app.MapGet("/api/recurring-priorities/{id}", async (int id, AppDbContext db) =>
        {
            var template = await db.RecurringPriorities.AsNoTracking().FirstOrDefaultAsync(rp => rp.Id == id);
            return template is not null ? Results.Ok(template) : Results.NotFound();
        });

        // Create a new recurring priority template
        app.MapPost("/api/recurring-priorities", async (RecurringPriority template, AppDbContext db) =>
        {
            template.CreatedAt = DateTime.UtcNow;
            
            // Validate cron expression
            if (!IsValidCronExpression(template.CronExpression))
            {
                return Results.BadRequest(new { error = "Invalid cron expression" });
            }

            db.RecurringPriorities.Add(template);
            await db.SaveChangesAsync();
            
            // Trigger job to generate priorities for today if template is active
            if (template.IsActive)
            {
                BackgroundJob.Enqueue<RecurringPriorityGeneratorJob>(job => 
                    job.Execute(DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")));
            }
            
            return Results.Created($"/api/recurring-priorities/{template.Id}", template);
        });

        // Update a recurring priority template
        app.MapPut("/api/recurring-priorities/{id}", async (int id, RecurringPriority updatedTemplate, AppDbContext db) =>
        {
            var template = await db.RecurringPriorities.FindAsync(id);
            if (template is null) return Results.NotFound();

            // Validate cron expression
            if (!IsValidCronExpression(updatedTemplate.CronExpression))
            {
                return Results.BadRequest(new { error = "Invalid cron expression" });
            }

            template.Name = updatedTemplate.Name;
            template.CronExpression = updatedTemplate.CronExpression;
            template.Importance = updatedTemplate.Importance;
            template.IsActive = updatedTemplate.IsActive;

            await db.SaveChangesAsync();

            // If template is deactivated, remove all future Priority instances linked to it
            if (!template.IsActive)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var futurePriorities = await db.Priorities
                    .Include(p => p.DailyEntry)
                    .Where(p => p.RecurringPriorityId == id && p.DailyEntry!.Date >= today)
                    .ToListAsync();

                db.Priorities.RemoveRange(futurePriorities);
                await db.SaveChangesAsync();
            }
            else
            {
                // If template is active, trigger job to generate priorities for today
                BackgroundJob.Enqueue<RecurringPriorityGeneratorJob>(job => 
                    job.Execute(DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")));
            }

            return Results.Ok(template);
        });

        // Soft delete (deactivate) a recurring priority template and remove future instances
        app.MapDelete("/api/recurring-priorities/{id}", async (int id, AppDbContext db) =>
        {
            var template = await db.RecurringPriorities.FindAsync(id);
            if (template is null) return Results.NotFound();

            // Soft delete: deactivate instead of removing
            template.IsActive = false;
            
            // Remove all future Priority instances linked to this template
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var futurePriorities = await db.Priorities
                .Include(p => p.DailyEntry)
                .Where(p => p.RecurringPriorityId == id && p.DailyEntry!.Date >= today)
                .ToListAsync();

            db.Priorities.RemoveRange(futurePriorities);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        // Toggle IsActive status
        app.MapPatch("/api/recurring-priorities/{id}/toggle", async (int id, AppDbContext db) =>
        {
            var template = await db.RecurringPriorities.FindAsync(id);
            if (template is null) return Results.NotFound();

            template.IsActive = !template.IsActive;

            // If deactivated, remove future instances
            if (!template.IsActive)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var futurePriorities = await db.Priorities
                    .Include(p => p.DailyEntry)
                    .Where(p => p.RecurringPriorityId == id && p.DailyEntry!.Date >= today)
                    .ToListAsync();

                db.Priorities.RemoveRange(futurePriorities);
            }
            else
            {
                // If activated, trigger job to generate priorities for today
                BackgroundJob.Enqueue<RecurringPriorityGeneratorJob>(job => 
                    job.Execute(DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")));
            }

            await db.SaveChangesAsync();
            return Results.Ok(template);
        });

        return app;
    }

    private static bool IsValidCronExpression(string cronExpression)
    {
        try
        {
            CronExpression.Parse(cronExpression, CronFormat.Standard);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
