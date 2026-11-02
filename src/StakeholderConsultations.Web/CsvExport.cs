using System.Globalization;
using System.Text;
using System.Text.Json;
using StakeholderConsultations.Web.Data;

namespace StakeholderConsultations.Web;

public static class CsvExport
{
    public static byte[] Create(IReadOnlyList<SurveyResponse> responses)
    {
        var columns = new List<string> { "responseId", "receivedAt" };
        var seen = new HashSet<string>(columns, StringComparer.Ordinal);
        var rows = responses.Select(response =>
        {
            var answers = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(response.AnswersJson)
                ?? throw new JsonException("Stored answers must be an object.");
            foreach (var key in answers.Keys)
            {
                if (seen.Add(key)) columns.Add(key);
            }
            return (Response: response, Answers: answers);
        }).ToList();

        // A BOM lets Excel detect UTF-8 when opening the download directly.
        var csv = new StringBuilder("\uFEFF");
        csv.AppendJoin(',', columns.Select(c => Cell(c))).Append("\r\n");
        foreach (var (response, answers) in rows)
        {
            var cells = columns.Select(column => column switch
            {
                "responseId" => response.Id.ToString(),
                "receivedAt" => response.ReceivedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
                _ => answers.TryGetValue(column, out var value) ? Cell(value) : ""
            });
            csv.AppendJoin(',', cells).Append("\r\n");
        }
        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    private static string Cell(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Null => "",
        JsonValueKind.String => Cell(value.GetString()!),
        _ => Cell(value.GetRawText(), protectFormula: false)
    };

    private static string Cell(string value, bool protectFormula = true)
    {
        var trimmed = value.AsSpan().TrimStart();
        if (protectFormula && value.Length > 0 &&
            (value[0] is '\t' or '\r' or '\n' ||
             (!trimmed.IsEmpty && trimmed[0] is '=' or '+' or '-' or '@')))
            value = "'" + value;

        return value.IndexOfAny([',', '"', '\r', '\n']) >= 0
            ? "\"" + value.Replace("\"", "\"\"") + "\""
            : value;
    }
}
