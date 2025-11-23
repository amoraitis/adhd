using Api.Models;

namespace Api.Services;

public interface IPriorityRecommendationService
{
    /// <summary>
    /// Get AI-recommended priorities for a specific date based on historical data
    /// </summary>
    /// <param name="targetDate">The date to generate recommendations for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of recommended priorities with reasoning</returns>
    Task<List<RecommendedPriority>> GetRecommendationsAsync(DateOnly targetDate, CancellationToken cancellationToken = default);
}
