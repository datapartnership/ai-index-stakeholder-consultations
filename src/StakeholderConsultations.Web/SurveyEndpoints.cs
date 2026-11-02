using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Net.Http.Headers;
using StakeholderConsultations.Web.Data;

namespace StakeholderConsultations.Web;

public static class SurveyEndpoints
{
    public static void MapSurveyEndpoints(this WebApplication app)
    {
        app.MapPost("/api/responses", SubmitAsync);
        app.MapGet("/api/export", ExportAsync);
    }

    private static async Task<IResult> SubmitAsync(HttpRequest request, ISurveyResponseStore store,
        ILoggerFactory loggerFactory, CancellationToken cancellationToken)
    {
        if (!IsAllowedOrigin(request)) return Error(403, "Origin not allowed");
        if (!MediaTypeHeaderValue.TryParse(request.ContentType, out var contentType) ||
            !(contentType.MediaType.Equals("text/plain", StringComparison.OrdinalIgnoreCase) ||
              contentType.MediaType.Equals("application/json", StringComparison.OrdinalIgnoreCase)))
            return Error(415, "Expected text/plain or application/json");

        Dictionary<string, JsonElement> answers;
        try
        {
            if (request.ContentLength > SubmissionValidator.MaxBodyBytes)
                throw new SubmissionException(413, "Submission too large");

            // Bound actual bytes as well as Content-Length, including chunked requests.
            var body = new byte[SubmissionValidator.MaxBodyBytes + 1];
            var length = 0;
            while (length < body.Length)
            {
                var read = await request.Body.ReadAsync(body.AsMemory(length), cancellationToken);
                if (read == 0) break;
                length += read;
            }
            answers = SubmissionValidator.Parse(body.AsMemory(0, length));
        }
        catch (SubmissionException exception)
        {
            return Error(exception.StatusCode, exception.Message);
        }
        catch (BadHttpRequestException exception)
        {
            return Error(exception.StatusCode, "Could not read submission");
        }

        var response = new SurveyResponse
        {
            Id = Guid.NewGuid(),
            ReceivedAt = DateTimeOffset.UtcNow,
            AnswersJson = JsonSerializer.Serialize(answers)
        };
        try
        {
            await store.SaveAsync(response, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // Do not log the request, answers, credentials, or database exception text.
            loggerFactory.CreateLogger("SurveyStorage")
                .LogError("Could not save survey response ({ErrorType}).", exception.GetType().Name);
            return Error(503, "Could not save response");
        }
        return Results.Json(new { ok = true });
    }

    private static async Task<IResult> ExportAsync(HttpRequest request, IConfiguration configuration,
        ISurveyResponseStore store, ILoggerFactory loggerFactory, CancellationToken cancellationToken)
    {
        request.HttpContext.Response.Headers.CacheControl = "no-store";
        var expected = configuration["Survey:ExportKey"];
        if (string.IsNullOrWhiteSpace(expected)) return Error(503, "Export is not configured");
        if (!request.Headers.TryGetValue("X-Export-Key", out var given) || given.Count != 1 ||
            !CryptographicOperations.FixedTimeEquals(
                SHA256.HashData(Encoding.UTF8.GetBytes(expected)),
                SHA256.HashData(Encoding.UTF8.GetBytes(given[0] ?? ""))))
            return Error(401, "Unauthorized");

        try
        {
            var responses = await store.ReadAllAsync(cancellationToken);
            return Results.File(CsvExport.Create(responses), "text/csv; charset=utf-8", "survey-responses.csv");
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            loggerFactory.CreateLogger("SurveyStorage")
                .LogError("Could not export survey responses ({ErrorType}).", exception.GetType().Name);
            return Error(503, "Could not export responses");
        }
    }

    private static bool IsAllowedOrigin(HttpRequest request)
    {
        if (!request.Headers.TryGetValue("Origin", out var origins)) return true;
        if (origins.Count != 1 ||
            !Uri.TryCreate(origins[0], UriKind.Absolute, out var origin) ||
            origin.Scheme is not ("http" or "https") ||
            origin.AbsolutePath != "/" || origin.Query.Length != 0 ||
            origin.Fragment.Length != 0 || origin.UserInfo.Length != 0 ||
            !Uri.TryCreate($"{request.Scheme}://{request.Host}", UriKind.Absolute, out var server))
            return false;

        return Uri.Compare(origin, server, UriComponents.SchemeAndServer,
            UriFormat.Unescaped, StringComparison.OrdinalIgnoreCase) == 0;
    }

    private static IResult Error(int statusCode, string error) =>
        Results.Json(new { ok = false, error }, statusCode: statusCode);
}
