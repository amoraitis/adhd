using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Models;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddUserSecrets<Program>();

// Configure JSON serialization to handle cycles
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

// Add services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))) ;

// Read CORS origins from environment variable
var corsOrigins = builder.Configuration["CORS_ORIGINS"]?.Split(',') ?? new[] { "http://localhost:5173", "http://localhost:5174" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebClient", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors("AllowWebClient");

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
        return Results.Ok(existing);
    }

    db.DailyEntries.Add(entry);
    await db.SaveChangesAsync();
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
            
            return Results.Ok(new { 
                success = true, 
                movedToDate = nextAvailableDate.ToString("yyyy-MM-dd"),
                priority
            });
        }
    }
    
    return Results.BadRequest("No available day found within the next year");
});

app.Run();
