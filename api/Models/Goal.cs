namespace Api.Models;

public class Goal
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Type { get; set; } // 'short', 'medium', 'long'
    public DateTime Created { get; set; }
    public List<Step> Steps { get; set; } = new();
}
