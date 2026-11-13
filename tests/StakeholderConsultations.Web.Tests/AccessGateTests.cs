using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace StakeholderConsultations.Web.Tests;

public sealed class AccessGateTests
{
    private const string Password = "open-sesame";

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string password) =>
        client.PostAsync("/login", new FormUrlEncodedContent(new Dictionary<string, string> { ["password"] = password }));

    [Fact]
    public async Task SurveyIsPublicWhenNoPasswordIsConfigured()
    {
        await using var factory = new SurveyApplicationFactory();
        using var client = factory.CreateSurveyClient();
        using var page = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        using var submit = await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/index.html")]
    [InlineData("/survey.js")]
    [InlineData("/data/onet_activities.json")]
    public async Task PagesAndAssetsRedirectToLoginWithoutCookie(string path)
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/login", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task SubmissionsAreRejectedWithoutCookie()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ok").GetBoolean());
        Assert.Empty(factory.Store.Responses);
    }

    [Fact]
    public async Task LoginPageIsServedWithoutCaching()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await client.GetAsync("/login");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        Assert.Contains("type=\"password\"", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task WrongPasswordIsRejectedWithoutCookie()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var response = await LoginAsync(client, "wrong");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        Assert.Contains("not correct", await response.Content.ReadAsStringAsync());
        using var page = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.Redirect, page.StatusCode);
    }

    [Fact]
    public async Task LoginFromForeignOriginIsRejected()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("Origin", "https://other.test");
        using var response = await LoginAsync(client, Password);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task CorrectPasswordUnlocksSurveyAndSubmissions()
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: Password);
        using var client = factory.CreateSurveyClient();
        using var login = await LoginAsync(client, Password);
        Assert.Equal(HttpStatusCode.SeeOther, login.StatusCode);
        Assert.Equal("/", login.Headers.Location?.OriginalString);
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("survey_access=", cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookie, StringComparison.OrdinalIgnoreCase);

        using var page = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        using var data = await client.GetAsync("/data/onet_activities.json");
        Assert.Equal(HttpStatusCode.OK, data.StatusCode);
        using var submit = await client.PostAsync("/api/responses", new StringContent("{\"Q\":1}"));
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);
        Assert.Single(factory.Store.Responses);
    }

    [Theory]
    [InlineData("new-password", HttpStatusCode.OK)]
    [InlineData(Password, HttpStatusCode.Redirect)]
    public async Task CookiesOnlyWorkForTheCurrentPassword(string cookiePassword, HttpStatusCode expected)
    {
        await using var factory = new SurveyApplicationFactory(accessPassword: "new-password");
        using var client = factory.CreateSurveyClient();
        client.DefaultRequestHeaders.Add("Cookie", $"survey_access={AccessGate.CreateToken(cookiePassword)}");
        using var response = await client.GetAsync("/");
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
