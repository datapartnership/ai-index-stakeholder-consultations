namespace StakeholderConsultations.Web.Data;

public interface ISurveyResponseStore
{
    Task SaveAsync(SurveyResponse response, CancellationToken cancellationToken);
    Task<IReadOnlyList<SurveyResponse>> ReadAllAsync(CancellationToken cancellationToken);
}
