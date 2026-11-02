using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using StakeholderConsultations.Web.Data;

namespace StakeholderConsultations.Web.Tests;

public sealed class SurveyApplicationFactory(
    string? exportKey = "test-export-secret", bool useFakeStore = true,
    string? connectionString = null) : WebApplicationFactory<Program>
{
    public TestResponseStore Store { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["Survey:ExportKey"] = exportKey,
                ["ConnectionStrings:SurveyDatabase"] = connectionString
            }));
        if (useFakeStore)
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<ISurveyResponseStore>();
                services.AddSingleton<ISurveyResponseStore>(Store);
            });
        }
    }

    public HttpClient CreateSurveyClient() => CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false
    });
}

public sealed class TestResponseStore : ISurveyResponseStore
{
    public List<SurveyResponse> Responses { get; } = [];
    public Exception? Failure { get; set; }

    public Task SaveAsync(SurveyResponse response, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (Failure is not null) throw Failure;
        Responses.Add(response);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<SurveyResponse>> ReadAllAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (Failure is not null) throw Failure;
        return Task.FromResult<IReadOnlyList<SurveyResponse>>(
            Responses.OrderBy(r => r.ReceivedAt).ThenBy(r => r.Id).ToList());
    }
}
