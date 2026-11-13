using System.Text.Json;

namespace StakeholderConsultations.Web;

public static class SubmissionValidator
{
    public const int MaxBodyBytes = 20_000;
    public const int MaxFields = 120;
    public const int MaxValueLength = 5_000;

    public static Dictionary<string, JsonElement> Parse(ReadOnlyMemory<byte> body)
    {
        if (body.Length > MaxBodyBytes)
            throw new SubmissionException(413, "Submission too large");

        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
                throw new SubmissionException(400, "Expected a JSON object");

            var answers = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
            foreach (var field in document.RootElement.EnumerateObject())
            {
                if (answers.Count == MaxFields)
                    throw new SubmissionException(400, "Wrong number of fields");
                if (field.Name.Length is < 1 or > 64 ||
                    field.Name.Any(c => !(char.IsAsciiLetterOrDigit(c) || c == '_')))
                    throw new SubmissionException(400, "Invalid field name");
                if (field.Value.ValueKind is not (JsonValueKind.String or JsonValueKind.Number
                    or JsonValueKind.True or JsonValueKind.False or JsonValueKind.Null))
                    throw new SubmissionException(400, "Invalid field value");
                if (field.Value.ValueKind == JsonValueKind.String &&
                    field.Value.GetString()!.Length > MaxValueLength)
                    throw new SubmissionException(400, "Answer too long");
                if (!answers.TryAdd(field.Name, field.Value.Clone()))
                    throw new SubmissionException(400, "Duplicate field name");
            }

            if (answers.Count == 0)
                throw new SubmissionException(400, "Wrong number of fields");

            // These names belong to server metadata, never to submitted answers.
            answers.Remove("responseId");
            answers.Remove("receivedAt");
            return answers;
        }
        catch (Exception exception) when (exception is JsonException or InvalidOperationException)
        {
            // JSON strings are decoded lazily; invalid Unicode may surface after parsing.
            throw new SubmissionException(400, "Invalid JSON");
        }
    }
}

public sealed class SubmissionException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
