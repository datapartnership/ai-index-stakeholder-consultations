using Microsoft.EntityFrameworkCore;

namespace StakeholderConsultations.Web.Data;

public sealed class SqlSurveyResponseStore(SurveyDbContext db) : ISurveyResponseStore
{
    public async Task SaveAsync(SurveyResponse response, CancellationToken cancellationToken)
    {
        db.Responses.Add(response);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SurveyResponse>> ReadAllAsync(CancellationToken cancellationToken) =>
        await db.Responses.AsNoTracking()
            .OrderBy(r => r.ReceivedAt).ThenBy(r => r.Id)
            .ToListAsync(cancellationToken);
}
