using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace StakeholderConsultations.Web;

/// <summary>
/// Optional shared-password gate. When <c>Survey:AccessPassword</c> is set, every page, asset and
/// API call (except the login page and the separately protected export) needs a cookie that is
/// only issued after the password is entered. The cookie is an HMAC of the password, so it survives
/// restarts and works across instances, and changing the password signs everyone out.
/// </summary>
public static class AccessGate
{
    public const string PasswordKey = "Survey:AccessPassword";
    public const string CookieName = "survey_access";
    public const string LoginPath = "/login";
    public const int LoginAttemptsPerMinute = 20;
    private const string LoginRateLimitPolicy = "login";
    private static readonly byte[] TokenPurpose = "survey-access-v1"u8.ToArray();

    public static IServiceCollection AddAccessGate(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(LoginRateLimitPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = LoginAttemptsPerMinute,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                }));
        });

    public static void UseAccessGate(this WebApplication app)
    {
        if (string.IsNullOrEmpty(app.Configuration[PasswordKey]))
            app.Logger.LogWarning("Survey:AccessPassword is not configured; the survey is public.");

        app.UseRateLimiter();
        app.Use(async (context, next) =>
        {
            var password = context.RequestServices.GetRequiredService<IConfiguration>()[PasswordKey];
            var path = context.Request.Path;
            if (string.IsNullOrEmpty(password) ||
                path.Equals(LoginPath, StringComparison.OrdinalIgnoreCase) ||
                path.StartsWithSegments("/api/export", StringComparison.OrdinalIgnoreCase) ||
                HasValidCookie(context.Request, password))
            {
                await next(context);
                return;
            }

            context.Response.Headers.CacheControl = "no-store";
            if (path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
                await SurveyEndpoints.Error(401, "Password required").ExecuteAsync(context);
            else
                context.Response.Redirect(LoginPath);
        });
    }

    public static void MapAccessGate(this WebApplication app)
    {
        app.MapGet(LoginPath, () => LoginPage(error: null, StatusCodes.Status200OK));
        app.MapPost(LoginPath, LoginAsync).RequireRateLimiting(LoginRateLimitPolicy);
    }

    private static async Task<IResult> LoginAsync(HttpContext context, IConfiguration configuration)
    {
        var request = context.Request;
        var password = configuration[PasswordKey];
        if (string.IsNullOrEmpty(password)) return Results.Redirect("/", preserveMethod: false);
        if (!SurveyEndpoints.IsAllowedOrigin(request)) return Results.StatusCode(StatusCodes.Status403Forbidden);
        if (!request.HasFormContentType) return LoginPage("Please enter the password.", StatusCodes.Status400BadRequest);

        var form = await request.ReadFormAsync(context.RequestAborted);
        var given = form["password"].Count == 1 ? form["password"][0] ?? "" : "";
        if (!CryptographicOperations.FixedTimeEquals(
                SHA256.HashData(Encoding.UTF8.GetBytes(password)),
                SHA256.HashData(Encoding.UTF8.GetBytes(given))))
            return LoginPage("That password is not correct. Please try again.", StatusCodes.Status401Unauthorized);

        context.Response.Cookies.Append(CookieName, CreateToken(password), new CookieOptions
        {
            HttpOnly = true,
            Secure = request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromDays(30),
            IsEssential = true
        });
        context.Response.Headers.CacheControl = "no-store";
        context.Response.Headers.Location = "/";
        return Results.StatusCode(StatusCodes.Status303SeeOther);
    }

    public static string CreateToken(string password) =>
        Base64Url.EncodeToString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(password), TokenPurpose));

    private static bool HasValidCookie(HttpRequest request, string password)
    {
        if (!request.Cookies.TryGetValue(CookieName, out var cookie) || string.IsNullOrEmpty(cookie)) return false;
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(CreateToken(password)), Encoding.ASCII.GetBytes(cookie));
    }

    private static IResult LoginPage(string? error, int statusCode)
    {
        var errorHtml = error is null ? "" : $"""<p class="error" role="alert">{error}</p>""";
        var html = $$"""
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="robots" content="noindex">
              <title>AI Index stakeholder consultation</title>
              <style>
                body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f6f8;
                       font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c1f24; }
                main { background: #fff; border: 1px solid #dfe2e7; border-radius: 12px; padding: 32px; width: min(360px, 90vw);
                       box-shadow: 0 2px 12px rgba(0,0,0,.05); }
                h1 { font-size: 20px; margin: 0 0 8px; }
                p { margin: 0 0 20px; color: #5a616c; font-size: 14px; }
                label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; }
                input { box-sizing: border-box; width: 100%; padding: 10px 12px; font: inherit; border: 1px solid #c4c9d1; border-radius: 8px; }
                input:focus { outline: 2px solid #2160c4; outline-offset: 1px; }
                button { margin-top: 16px; width: 100%; padding: 10px; font: inherit; font-weight: 600; color: #fff;
                         background: #2160c4; border: 0; border-radius: 8px; cursor: pointer; }
                button:hover { background: #1a4fa3; }
                .error { color: #b3261e; margin: 12px 0 0; }
              </style>
            </head>
            <body>
              <main>
                <h1>AI Index stakeholder consultation</h1>
                <p>Please enter the password you received with your invitation.</p>
                <form method="post" action="{{LoginPath}}">
                  <label for="password">Password</label>
                  <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
                  {{errorHtml}}
                  <button type="submit">Continue</button>
                </form>
              </main>
            </body>
            </html>
            """;
        return new LoginPageResult(html, statusCode);
    }

    private sealed class LoginPageResult(string html, int statusCode) : IResult
    {
        public Task ExecuteAsync(HttpContext context)
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Content(html, "text/html; charset=utf-8", Encoding.UTF8, statusCode).ExecuteAsync(context);
        }
    }
}
