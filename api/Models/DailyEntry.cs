namespace Api.Models;

public class DailyEntry
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public string? BrainDump { get; set; }
    public List<Priority> Priorities { get; set; } = new();
    public string? Worries { get; set; }
    public TimeOnly? WorryTime { get; set; }
    public string? Gratitude { get; set; }
}
