using System.Text;
using System.Text.Json;
using StakeholderConsultations.Web;
using StakeholderConsultations.Web.Data;

namespace StakeholderConsultations.Web.Tests;

public sealed class CsvExportTests
{
    [Fact]
    public void ExportsEmptyDatabaseWithMetadataHeader() =>
        Assert.Equal("\uFEFFresponseId,receivedAt\r\n", Export([]));

    [Fact]
    public void UnionsQuestionColumnsAndEscapesUnicodeQuotesAndNewlines()
    {
        var first = Response(new { A = "café, \"hello\"\nnext line", B = true });
        var second = Response(new { C = -42, B = (string?)null });
        var csv = Export([first, second]);
        Assert.StartsWith("\uFEFFresponseId,receivedAt,A,B,C\r\n", csv);
        Assert.Contains(",\"café, \"\"hello\"\"\nnext line\",true,\r\n", csv);
        Assert.EndsWith(",,,-42\r\n", csv);
    }

    [Theory]
    [InlineData("=1+1", "'=1+1")]
    [InlineData("+1+1", "'+1+1")]
    [InlineData("-1+1", "'-1+1")]
    [InlineData("@SUM(A1)", "'@SUM(A1)")]
    [InlineData("\ttext", "'\ttext")]
    [InlineData("\rtext", "\"'\rtext\"")]
    [InlineData("\ntext", "\"'\ntext\"")]
    [InlineData("  =1+1", "'  =1+1")]
    [InlineData("ordinary text", "ordinary text")]
    [InlineData("", "")]
    public void ProtectsSpreadsheetFormulaCells(string value, string expected) =>
        Assert.EndsWith("," + expected + "\r\n", Export([Response(new { Q = value })]));

    [Fact]
    public void StoredAnswerNamesCannotOverrideServerMetadata()
    {
        var response = Response(new { responseId = "spoof", receivedAt = "spoof", Q = "value" });
        var csv = Export([response]);
        Assert.DoesNotContain("spoof", csv);
        Assert.Equal("\uFEFFresponseId,receivedAt,Q\r\n" + response.Id +
            ",2026-11-02T12:00:00.0000000+00:00,value\r\n", csv);
    }

    private static SurveyResponse Response(object answers) => new()
    {
        Id = Guid.NewGuid(),
        ReceivedAt = new DateTimeOffset(2026, 11, 2, 12, 0, 0, TimeSpan.Zero),
        AnswersJson = JsonSerializer.Serialize(answers)
    };

    private static string Export(IReadOnlyList<SurveyResponse> responses) =>
        Encoding.UTF8.GetString(CsvExport.Create(responses));
}
