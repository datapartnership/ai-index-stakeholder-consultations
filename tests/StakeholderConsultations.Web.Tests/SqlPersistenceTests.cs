using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StakeholderConsultations.Web.Data;

namespace StakeholderConsultations.Web.Tests;

public sealed class SqlPersistenceTests
{
    [SqlDatabaseFact]
    public async Task MigratesDatabasePersistsSubmissionAndExportsIt()
    {
        // This must point to a dedicated test database. Only this test's response is deleted.
        await using var factory = new SurveyApplicationFactory(useFakeStore: false,
            connectionString: Environment.GetEnvironmentVariable("SURVEY_TEST_SQL_CONNECTION"));
        using var client = factory.CreateSurveyClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SurveyDbContext>();
        // Creating the client starts the application, which must apply migrations itself.
        Assert.NotEmpty(await db.Database.GetAppliedMigrationsAsync());
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.False(db.Database.HasPendingModelChanges());

        var marker = "integration_" + Guid.NewGuid().ToString("N");
        try
        {
            using var submission = await client.PostAsync("/api/responses", new StringContent(
                JsonSerializer.Serialize(new { TEST_Q1 = marker, NEW_Q2 = "café" }), Encoding.UTF8, "text/plain"));
            Assert.Equal(HttpStatusCode.OK, submission.StatusCode);
            var saved = await db.Responses.AsNoTracking().SingleAsync(r => r.AnswersJson.Contains(marker));
            Assert.NotEqual(Guid.Empty, saved.Id);

            client.DefaultRequestHeaders.Add("X-Export-Key", "test-export-secret");
            using var export = await client.GetAsync("/api/export");
            Assert.Equal(HttpStatusCode.OK, export.StatusCode);
            var csv = await export.Content.ReadAsStringAsync();
            Assert.Contains(marker, csv);
            Assert.Contains(saved.Id.ToString(), csv);
            Assert.Contains("café", csv);

            // A second startup must leave the existing schema and saved answers intact.
            await using var restarted = new SurveyApplicationFactory(useFakeStore: false,
                connectionString: Environment.GetEnvironmentVariable("SURVEY_TEST_SQL_CONNECTION"));
            using var restartedClient = restarted.CreateSurveyClient();
            restartedClient.DefaultRequestHeaders.Add("X-Export-Key", "test-export-secret");
            using var restartedExport = await restartedClient.GetAsync("/api/export");
            Assert.Equal(HttpStatusCode.OK, restartedExport.StatusCode);
            var restartedCsv = await restartedExport.Content.ReadAsStringAsync();
            Assert.Contains(marker, restartedCsv);
            Assert.Contains(saved.Id.ToString(), restartedCsv);
        }
        finally
        {
            await db.Responses.Where(r => r.AnswersJson.Contains(marker)).ExecuteDeleteAsync();
        }
    }
}

public sealed class SqlDatabaseFactAttribute : FactAttribute
{
    public SqlDatabaseFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SURVEY_TEST_SQL_CONNECTION")))
            Skip = "Set SURVEY_TEST_SQL_CONNECTION to a dedicated SQL Server/Azure SQL test database.";
    }
}
