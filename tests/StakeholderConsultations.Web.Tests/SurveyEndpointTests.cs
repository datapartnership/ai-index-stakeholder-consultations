using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace StakeholderConsultations.Web.Tests;

public sealed class SurveyEndpointTests
{
    [Theory]
    [InlineData("text/plain")]
    [InlineData("application/json")]
    public async Task SavesResponseWithAuthoritativeServerMetadata(string mediaType)
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        var before = DateTimeOffset.UtcNow;
        using var response = await client.PostAsync("/api/responses", new StringContent(
            "{\"responseId\":\"spoof\",\"receivedAt\":\"spoof\",\"submittedAt\":\"1999-01-01\",\"NEW_Q1\":\"café\"}",
            Encoding.UTF8, mediaType));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ok").GetBoolean());
        var stored = Assert.Single(factory.Store.Responses);
        Assert.NotEqual(Guid.Empty, stored.Id);
        Assert.InRange(stored.ReceivedAt, before, DateTimeOffset.UtcNow);
        var answers = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(stored.AnswersJson)!;
        Assert.False(answers.ContainsKey("responseId"));
        Assert.False(answers.ContainsKey("receivedAt"));
        Assert.Equal("1999-01-01", answers["submittedAt"].GetString());
        Assert.Equal("café", answers["NEW_Q1"].GetString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("https://localhost")]
    [InlineData("https://LOCALHOST:443")]
    public async Task AcceptsSameOriginAndNonBrowserRequests(string? origin)
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        if (origin is not null) client.DefaultRequestHeaders.Add("Origin", origin);
        using var response = await client.PostAsync("/api/responses", new StringContent("{\"Q\":\"yes\"}"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(factory.Store.Responses);
    }

    [Theory]
    [InlineData("https://other.test")]
    [InlineData("http://localhost")]
    [InlineData("https://localhost:444")]
    [InlineData("null")]
    [InlineData("https://user@localhost")]
    [InlineData("https://localhost/path")]
    [InlineData("https://localhost?other=1")]
    public async Task RejectsForeignOrInvalidOrigins(string origin)
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("Origin", origin);
        using var response = await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(factory.Store.Responses);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Theory]
    [InlineData("https://pages.example", "https://pages.example")]
    [InlineData("https://PAGES.example", "https://pages.example/repo/")]
    [InlineData("https://second.example", "https://pages.example, https://second.example")]
    public async Task AcceptsConfiguredFrontendOriginWithCorsHeaders(string origin, string allowedOrigins)
    {
        await using var factory = new SurveyApplicationFactory(allowedOrigins: allowedOrigins);
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("Origin", origin);
        using var response = await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(origin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
        Assert.Single(factory.Store.Responses);
    }

    [Fact]
    public async Task AnswersPreflightFromConfiguredOrigin()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: "secret", allowedOrigins: "https://pages.example");
        using var client = factory.CreateSurveyClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/responses");
        request.Headers.Add("Origin", "https://pages.example");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("https://pages.example", Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        var allowedHeaders = string.Join(",", response.Headers.GetValues("Access-Control-Allow-Headers"));
        Assert.Contains("Authorization", allowedHeaders, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task IgnoresPreflightFromUnconfiguredOrigin()
    {
        await using var factory = new SurveyApplicationFactory(allowedOrigins: "https://pages.example");
        using var client = factory.CreateSurveyClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/responses");
        request.Headers.Add("Origin", "https://other.test");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        using var response = await client.SendAsync(request);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task RootReportsApiStatus()
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var response = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ok").GetBoolean());
    }

    [Theory]
    [InlineData(false, 20000, HttpStatusCode.OK)]
    [InlineData(false, 20001, HttpStatusCode.RequestEntityTooLarge)]
    [InlineData(true, 20000, HttpStatusCode.OK)]
    [InlineData(true, 20001, HttpStatusCode.RequestEntityTooLarge)]
    public async Task EnforcesBodyLimitForKnownAndUnknownLengths(bool streaming, int length, HttpStatusCode expected)
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        var bytes = Encoding.UTF8.GetBytes("{\"Q\":1}".PadRight(length));
        using HttpContent content = streaming ? new StreamingContent(bytes) : new ByteArrayContent(bytes);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
        using var response = await client.PostAsync("/api/responses", content);
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal(expected == HttpStatusCode.OK ? 1 : 0, factory.Store.Responses.Count);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("not json")]
    [InlineData("{\"Q\":[]}")]
    [InlineData("{\"Q\":\"\\uD800\"}")]
    public async Task ReturnsJsonValidationErrors(string json)
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var response = await client.PostAsync("/api/responses", new StringContent(json));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ok").GetBoolean());
        Assert.Empty(factory.Store.Responses);
    }

    [Fact]
    public async Task RejectsUnsupportedMediaType()
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var response = await client.PostAsync("/api/responses",
            new StringContent("{\"Q\":1}", Encoding.UTF8, "text/html"));
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
        Assert.Empty(factory.Store.Responses);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("wrong")]
    [InlineData("test-export-secret-with-extra-text")]
    public async Task RejectsMissingOrIncorrectExportKey(string? key)
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        if (key is not null) client.DefaultRequestHeaders.Add("X-Export-Key", key);
        using var response = await client.GetAsync("/api/export?key=test-export-secret");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task RejectsMultipleExportKeyHeaders()
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("X-Export-Key", ["test-export-secret", "another"]);
        using var response = await client.GetAsync("/api/export");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DisablesExportWhenNotConfigured()
    {
        await using var factory = new SurveyApplicationFactory(exportKey: null);
        using var client = factory.CreateSurveyClient();
        using var response = await client.GetAsync("/api/export");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task ExportsSavedAnswersAsCsv()
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var submission = await client.PostAsync("/api/responses", new StringContent("{\"Q\":\"café\"}"));
        submission.EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.Add("X-Export-Key", "test-export-secret");
        using var response = await client.GetAsync("/api/export");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("utf-8", response.Content.Headers.ContentType?.CharSet);
        Assert.Equal("survey-responses.csv", response.Content.Headers.ContentDisposition?.FileName);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, bytes[..3]);
        var csv = Encoding.UTF8.GetString(bytes);
        Assert.StartsWith("\uFEFFresponseId,receivedAt,Q\r\n", csv);
        Assert.Contains(Assert.Single(factory.Store.Responses).Id.ToString(), csv);
        Assert.Contains(",café\r\n", csv);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task StorageFailuresReturnRetryableErrorsWithoutPrivateDetails(bool export)
    {
        await using var factory = new SurveyApplicationFactory();
        factory.Store.Failure = new InvalidOperationException("private database details");
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("X-Export-Key", "test-export-secret");
        using var response = export ? await client.GetAsync("/api/export") :
            await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("private", await response.Content.ReadAsStringAsync());
        Assert.False((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ok").GetBoolean());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MissingSqlConfigurationReturns503(bool export)
    {
        await using var factory = new SurveyApplicationFactory(useFakeStore: false);
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("X-Export-Key", "test-export-secret");
        using var response = export ? await client.GetAsync("/api/export") :
            await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.False((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ok").GetBoolean());
    }

    [Theory]
    [InlineData("/index.html")]
    [InlineData("/style.css")]
    [InlineData("/survey.js")]
    [InlineData("/data/onet_activities.json")]
    [InlineData("/worker.js")]
    [InlineData("/appsettings.json")]
    [InlineData("/Archive.zip")]
    [InlineData("/build_onet_data.py")]
    [InlineData("/data/soc_tasks.csv")]
    [InlineData("/.git/config")]
    [InlineData("/api/missing")]
    [InlineData("/missing-page")]
    public async Task KeepsPrivateFilesAndMissingRoutesUnavailable(string path)
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task WrongSubmissionMethodReturns405()
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var response = await client.GetAsync("/api/responses");
        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    private sealed class StreamingContent(byte[] bytes) : HttpContent
    {
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) =>
            stream.WriteAsync(bytes).AsTask();

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }
    }
}
