namespace StakeholderConsultations.Web.Tests;

public sealed class StartupMigrationTests
{
    [Fact]
    public async Task InvalidSqlConfigurationPreventsStartup()
    {
        await using var factory = new SurveyApplicationFactory(useFakeStore: false,
            connectionString: "invalid-connection-string");

        // The application must attempt migration before it can serve any requests.
        Assert.Throws<ArgumentException>(() => factory.CreateSurveyClient());
    }
}
