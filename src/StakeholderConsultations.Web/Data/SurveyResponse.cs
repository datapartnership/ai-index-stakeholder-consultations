namespace StakeholderConsultations.Web.Data;

public sealed class SurveyResponse
{
    public Guid Id { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
    public required string AnswersJson { get; set; }
}
