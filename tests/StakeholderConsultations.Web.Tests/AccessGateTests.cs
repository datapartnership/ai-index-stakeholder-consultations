using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace StakeholderConsultations.Web.Tests;

public sealed class AccessGateTests
{
    private const string Password = "open-sesame";

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string password) =>
        client.PostAsJsonAsync("/api/login", new { password });

    private static HttpRequestMessage Submit(string? token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/responses") { Content = new StringContent("{\"Q\":1}") };
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    [Fact]
    public async Task SubmissionsArePublicWhenNoPasswordIsConfigured()
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var access = await client.GetAsync("/api/access");
        Assert.False((await access.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("required").GetBoolean());
        using var submit = await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);
    }

    [Fact]
    public async Task AccessEndpointReportsThatPasswordIsRequired()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await client.GetAsync("/api/access");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("required").GetBoolean());
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("not-the-token", false)]
    [InlineData(Password, true)]
    public async Task AccessEndpointReportsWhetherStoredTokenIsValid(string? tokenFor, bool expected)
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/access");
        if (tokenFor is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer",
                tokenFor == Password ? AccessGate.CreateToken(Password) : tokenFor);
        using var response = await client.SendAsync(request);
        Assert.Equal(expected, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("authorized").GetBoolean());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-the-token")]
    public async Task SubmissionsAreRejectedWithoutValidToken(string? token)
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await client.SendAsync(Submit(token));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ok").GetBoolean());
        Assert.Empty(factory.Store.Responses);
    }

    [Fact]
    public async Task WrongPasswordIsRejectedWithoutToken()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await LoginAsync(client, "wrong");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.TryGetProperty("token", out _));
        Assert.Contains("not correct", body.GetProperty("error").GetString());
    }

    [Theory]
    [InlineData("{}", "application/json", HttpStatusCode.BadRequest)]
    [InlineData("not json", "application/json", HttpStatusCode.BadRequest)]
    [InlineData("{\"password\":1}", "application/json", HttpStatusCode.BadRequest)]
    [InlineData("password=open-sesame", "application/x-www-form-urlencoded", HttpStatusCode.UnsupportedMediaType)]
    public async Task MalformedLoginRequestsAreRejected(string body, string mediaType, HttpStatusCode expected)
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await client.PostAsync("/api/login", new StringContent(body, Encoding.UTF8, mediaType));
        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task LoginFromForeignOriginIsRejected()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("Origin", "https://other.test");
        using var response = await LoginAsync(client, Password);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CorrectPasswordFromAllowedOriginUnlocksSubmissions()
    {
        const string origin = "https://pages.example";
        await using var factory = new SurveyApplicationFactory(accessPassword: Password, allowedOrigins: origin);
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("Origin", origin);
        using var login = await LoginAsync(client, Password);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.Equal(origin, Assert.Single(login.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.False(login.Headers.Contains("Set-Cookie"));
        var token = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        Assert.Equal(AccessGate.CreateToken(Password), token);

        using var submit = await client.SendAsync(Submit(token));
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);
        Assert.Single(factory.Store.Responses);
    }

    [Theory]
    [InlineData("new-password", HttpStatusCode.OK)]
    [InlineData(Password, HttpStatusCode.Unauthorized)]
    public async Task TokensOnlyWorkForTheCurrentPassword(string tokenPassword, HttpStatusCode expected)
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: "new-password");
        using var client = factory.CreateSurveyClient();
        using var response = await client.SendAsync(Submit(AccessGate.CreateToken(tokenPassword)));
        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task ExportStillUsesOnlyItsOwnKey()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var denied = await client.GetAsync("/api/export");
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);
        client.DefaultRequestHeaders.Add("X-Export-Key", "test-export-secret");
        using var allowed = await client.GetAsync("/api/export");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    [Fact]
    public async Task LoginAttemptsAreRateLimited()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        for (var i = 0; i < AccessGate.LoginAttemptsPerMinute; i++)
        {
            using var attempt = await LoginAsync(client, "wrong");
            Assert.Equal(HttpStatusCode.Unauthorized, attempt.StatusCode);
        }
        using var blocked = await LoginAsync(client, Password);
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
    }
}
