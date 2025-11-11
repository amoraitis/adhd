namespace Api.Models;

public class Priority
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public bool Done { get; set; }
    public int DailyEntryId { get; set; }
    public DailyEntry? DailyEntry { get; set; }
    public int Importance { get; set; } // 1 = most important, 2 = second, 3 = third
}
