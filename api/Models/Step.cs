namespace Api.Models;

public class Step
{
    public int Id { get; set; }
    public required string Text { get; set; }
    public bool Done { get; set; }
    public int GoalId { get; set; }
    public Goal? Goal { get; set; }
}
