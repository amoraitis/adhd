using Api.Services;

namespace Api.Extensions;

public static partial class EndpointExtensions
{
    public static void MapRecommendationsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/recommendations");

        // GET /api/recommendations/{date}
        group.MapGet("/{date}", async (string date, IPriorityRecommendationService recommendationService) =>
        {
            if (!DateOnly.TryParse(date, out var targetDate))
            {
                return Results.BadRequest(new { error = "Invalid date format. Use YYYY-MM-DD." });
            }

            var recommendations = await recommendationService.GetRecommendationsAsync(targetDate);
            return Results.Ok(recommendations);
        })
        .WithName("GetRecommendations")
        .WithOpenApi();
    }
}
