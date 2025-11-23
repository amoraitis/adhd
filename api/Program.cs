using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Models;
using System.Text.Json.Serialization;
using Hangfire;
using Hangfire.PostgreSql;
using Api.Extensions;
using Api;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddUserSecrets<Program>();

builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

// Configure JSON serialization to handle cycles
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

// Add services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))) ;

// Add memory cache for AI recommendations
builder.Services.AddMemoryCache();

// Register notification service
builder.Services.AddScoped<Api.Services.INotificationService, Api.Services.NotificationService>();

// Register AI recommendation service
builder.Services.AddScoped<Api.Services.IPriorityRecommendationService, Api.Services.PriorityRecommendationService>();

// Configure Hangfire
builder.Services.AddHangfire(x =>
 x.UsePostgreSqlStorage(options => options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"))));
builder.Services.AddCors();
builder.Services.AddHangfireServer();

var app = builder.Build();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors(opt => opt.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
app.UseHangfireDashboard("/dashboard");

app.MapApiEndpoints();
app.MapRecurringPrioritiesEndpoints();
app.MapRecommendationsEndpoints();

// Schedule recurring job to generate priorities daily at midnight
RecurringJob.AddOrUpdate<Api.Jobs.RecurringPriorityGeneratorJob>(
    "generate-recurring-priorities",
    job => job.Execute(DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")),
    Cron.Daily(0, 0),
    new RecurringJobOptions { TimeZone = TimeZoneInfo.FindSystemTimeZoneById(builder.Configuration.GetValue<string>("AppSettings:Timezone") ?? throw new InvalidOperationException("TimeZoneInfo configuration is missing")) }
);

app.Run();
