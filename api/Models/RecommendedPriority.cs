namespace Api.Models;

public class RecommendedPriority
{
    public required string Name { get; set; }
    public required string Reason { get; set; }
    public int SuggestedImportance { get; set; } // 1 = most important, 2 = second, 3 = third
    public double Confidence { get; set; } // 0.0 to 1.0
}
