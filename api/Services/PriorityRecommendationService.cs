using System.Text;
using System.Text.Json;
using Api.Data;
using Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using OpenAI;
using OpenAI.Chat;

namespace Api.Services;

public class PriorityRecommendationService : IPriorityRecommendationService
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PriorityRecommendationService> _logger;
    private readonly ChatClient _chatClient;

    public PriorityRecommendationService(
        AppDbContext db,
        IMemoryCache cache,
        IConfiguration configuration,
        ILogger<PriorityRecommendationService> logger)
    {
        _db = db;
        _cache = cache;
        _configuration = configuration;
        _logger = logger;

        var apiKey = _configuration["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("OpenAI API key not configured. Recommendations will not be available.");
            _chatClient = null!;
        }
        else
        {
            var model = _configuration["OpenAI:Model"] ?? "gpt-4o-mini";
            var baseUrl = _configuration["OpenAI:BaseUrl"];
            
            if (!string.IsNullOrEmpty(baseUrl))
            {
                // Custom endpoint (e.g., Groq, OpenRouter, Azure, etc.)
                var options = new OpenAIClientOptions
                {
                    Endpoint = new Uri(baseUrl)
                };
                var credential = new System.ClientModel.ApiKeyCredential(apiKey);
                var client = new OpenAIClient(credential, options);
                _chatClient = client.GetChatClient(model);
            }
            else
            {
                // Default OpenAI endpoint
                _chatClient = new ChatClient(model, apiKey);
            }
        }
    }

    public async Task<List<RecommendedPriority>> GetRecommendationsAsync(
        DateOnly targetDate, 
        CancellationToken cancellationToken = default)
    {
        if (_chatClient == null)
        {
            _logger.LogWarning("Cannot generate recommendations: OpenAI API key not configured");
            return new List<RecommendedPriority>();
        }

        // Check cache first (10-minute expiration)
        var cacheKey = $"priority-recommendations-{targetDate:yyyy-MM-dd}";
        if (_cache.TryGetValue<List<RecommendedPriority>>(cacheKey, out var cachedRecommendations))
        {
            _logger.LogInformation("Returning cached recommendations for {Date}", targetDate);
            return cachedRecommendations!;
        }

        try
        {
            // Get historical priority data (last 14 days before target date)
            var startDate = targetDate.AddDays(-14);
            var endDate = targetDate.AddDays(-1); // Don't include target date

            var historicalEntries = await _db.DailyEntries
                .AsNoTracking()
                .Include(d => d.Priorities)
                .Where(d => d.Date >= startDate && d.Date <= endDate)
                .OrderByDescending(d => d.Date)
                .ToListAsync(cancellationToken);

            if (!historicalEntries.Any() || !historicalEntries.Any(e => e.Priorities.Any()))
            {
                _logger.LogInformation("No historical data available for recommendations");
                return new List<RecommendedPriority>();
            }

            // Build context for AI
            var context = BuildHistoricalContext(historicalEntries, targetDate);

            // Call OpenAI API
            var recommendations = await GenerateRecommendationsAsync(context, targetDate, cancellationToken);

            // Cache for 10 minutes
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));
            _cache.Set(cacheKey, recommendations, cacheOptions);

            _logger.LogInformation("Generated {Count} recommendations for {Date}", recommendations.Count, targetDate);
            return recommendations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating priority recommendations for {Date}", targetDate);
            return new List<RecommendedPriority>();
        }
    }

    private string BuildHistoricalContext(List<DailyEntry> entries, DateOnly targetDate)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Historical Priority Data:");
        sb.AppendLine();

        foreach (var entry in entries)
        {
            var dayOfWeek = entry.Date.DayOfWeek;
            sb.AppendLine($"Date: {entry.Date:yyyy-MM-dd} ({dayOfWeek})");
            
            if (entry.Priorities.Any())
            {
                foreach (var priority in entry.Priorities.OrderBy(p => p.Importance))
                {
                    var status = priority.Done ? "✓ Completed" : "✗ Not completed";
                    var recurring = priority.RecurringPriorityId.HasValue ? " (Recurring)" : "";
                    sb.AppendLine($"  Priority #{priority.Importance}: {priority.Name} - {status}{recurring}");
                }
            }
            else
            {
                sb.AppendLine("  No priorities recorded");
            }
            sb.AppendLine();
        }

        sb.AppendLine($"Target Date: {targetDate:yyyy-MM-dd} ({targetDate.DayOfWeek})");
        
        return sb.ToString();
    }

    private async Task<List<RecommendedPriority>> GenerateRecommendationsAsync(
        string context, 
        DateOnly targetDate,
        CancellationToken cancellationToken)
    {
        var systemPrompt = @"You are an AI assistant helping someone with ADHD manage their daily priorities. 
Analyze the historical priority data and suggest 3 priorities for the target date.

Consider:
1. Patterns in what they typically do on similar days of the week
2. Recurring priorities that appear frequently
3. Important tasks that weren't completed and might need to carry over
4. Balance between recurring tasks and new/varied activities
5. The day of the week (weekdays vs weekends have different patterns)

Return ONLY a valid JSON array with exactly 3 recommendations, no additional text.
Format:
[
  {
    ""name"": ""Priority name"",
    ""reason"": ""Brief explanation why this is recommended"",
    ""suggestedImportance"": 1,
    ""confidence"": 0.85
  }
]

suggestedImportance: 1 (most important), 2 (medium), 3 (least important)
confidence: 0.0 to 1.0 (how confident you are in this recommendation)";

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage(context)
        };

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = int.Parse(_configuration["OpenAI:MaxTokens"] ?? "500"),
            Temperature = float.Parse(_configuration["OpenAI:Temperature"] ?? "0.7")
        };

        var completion = await _chatClient.CompleteChatAsync(messages, chatOptions, cancellationToken);
        var responseText = completion.Value.Content[0].Text;

        _logger.LogDebug("OpenAI response: {Response}", responseText);

        // Parse JSON response
        try
        {
            var recommendations = JsonSerializer.Deserialize<List<RecommendedPriority>>(
                responseText,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (recommendations == null || recommendations.Count == 0)
            {
                _logger.LogWarning("OpenAI returned no recommendations");
                return new List<RecommendedPriority>();
            }

            // Ensure we have exactly 3 recommendations
            return recommendations.Take(3).ToList();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse OpenAI response as JSON: {Response}", responseText);
            return new List<RecommendedPriority>();
        }
    }
}
