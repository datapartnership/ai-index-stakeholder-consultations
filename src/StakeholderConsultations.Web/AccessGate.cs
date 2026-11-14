using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Net.Http.Headers;

namespace StakeholderConsultations.Web;

/// <summary>
/// Optional shared-password gate for submissions. When <c>Survey:AccessPassword</c> is set,
/// <c>POST /api/responses</c> needs an <c>Authorization: Bearer &lt;token&gt;</c> header. The frontend
/// (hosted separately, e.g. on GitHub Pages) obtains the token from <c>POST /api/login</c> and keeps it
/// in local storage. A bearer header is used instead of a cookie because a cookie from the API's domain
/// would be a third-party cookie on the frontend's domain, which browsers block. The token is an HMAC of
/// the password, so it survives restarts and works across instances, and changing the password signs
/// everyone out. The export endpoint is protected separately by its own key.
/// </summary>
public static class AccessGate
{
    public const string PasswordKey = "Survey:AccessPassword";
    public const string AccessPath = "/api/access";
    public const string LoginPath = "/api/login";
    public const string ProtectedPath = "/api/responses";
    public const int LoginAttemptsPerMinute = 20;
    private const int MaxLoginBodyBytes = 4096;
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
            app.Logger.LogWarning("Survey:AccessPassword is not configured; submissions are public.");

        app.UseRateLimiter();
        app.Use(async (context, next) =>
        {
            var password = context.RequestServices.GetRequiredService<IConfiguration>()[PasswordKey];
            if (string.IsNullOrEmpty(password) ||
                HttpMethods.IsOptions(context.Request.Method) ||
                !context.Request.Path.StartsWithSegments(ProtectedPath, StringComparison.OrdinalIgnoreCase) ||
                HasValidToken(context.Request, password))
            {
                await next(context);
                return;
            }

            context.Response.Headers.CacheControl = "no-store";
            context.Response.Headers.WWWAuthenticate = "Bearer";
            await SurveyEndpoints.Error(401, "Password required").ExecuteAsync(context);
        });
    }

    public static void MapAccessGate(this WebApplication app)
    {
        app.MapGet(AccessPath, (HttpContext context, IConfiguration configuration) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var password = configuration[PasswordKey];
            var required = !string.IsNullOrEmpty(password);
            // `authorized` lets the frontend check a stored token before revealing the page.
            return Results.Json(new { required, authorized = !required || HasValidToken(context.Request, password!) });
        });
        app.MapPost(LoginPath, LoginAsync).RequireRateLimiting(LoginRateLimitPolicy);
    }

    private static async Task<IResult> LoginAsync(HttpContext context, IConfiguration configuration)
    {
        var request = context.Request;
        context.Response.Headers.CacheControl = "no-store";
        if (!SurveyEndpoints.IsAllowedOrigin(request)) return SurveyEndpoints.Error(403, "Origin not allowed");

        var password = configuration[PasswordKey];
        if (string.IsNullOrEmpty(password)) return Results.Json(new { ok = true, token = (string?)null });

        if (!MediaTypeHeaderValue.TryParse(request.ContentType, out var contentType) ||
            !contentType.MediaType.Equals("application/json", StringComparison.OrdinalIgnoreCase))
            return SurveyEndpoints.Error(415, "Expected application/json");
        if (request.ContentLength > MaxLoginBodyBytes) return SurveyEndpoints.Error(413, "Request too large");

        string given;
        try
        {
            var body = new byte[MaxLoginBodyBytes + 1];
            var length = 0;
            while (length < body.Length)
            {
                var read = await request.Body.ReadAsync(body.AsMemory(length), context.RequestAborted);
                if (read == 0) break;
                length += read;
            }
            if (length > MaxLoginBodyBytes) return SurveyEndpoints.Error(413, "Request too large");

            using var document = JsonDocument.Parse(body.AsMemory(0, length));
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty("password", out var value) ||
                value.ValueKind != JsonValueKind.String)
                return SurveyEndpoints.Error(400, "Please enter the password.");
            given = value.GetString() ?? "";
        }
        catch (JsonException)
        {
            return SurveyEndpoints.Error(400, "Please enter the password.");
        }
        catch (BadHttpRequestException exception)
        {
            return SurveyEndpoints.Error(exception.StatusCode, "Could not read request");
        }

        if (!CryptographicOperations.FixedTimeEquals(
                SHA256.HashData(Encoding.UTF8.GetBytes(password)),
                SHA256.HashData(Encoding.UTF8.GetBytes(given))))
            return SurveyEndpoints.Error(401, "That password is not correct. Please try again.");

        return Results.Json(new { ok = true, token = CreateToken(password) });
    }

    public static string CreateToken(string password) =>
        Base64Url.EncodeToString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(password), TokenPurpose));

    private static bool HasValidToken(HttpRequest request, string password)
    {
        var header = request.Headers.Authorization;
        if (header.Count != 1 || header[0] is not { } value ||
            !value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return false;
        var token = value["Bearer ".Length..].Trim();
        return token.Length > 0 && CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(CreateToken(password)), Encoding.ASCII.GetBytes(token));
    }
}
