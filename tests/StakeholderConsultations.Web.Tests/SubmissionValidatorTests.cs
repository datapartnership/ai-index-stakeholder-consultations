using System.Text;
using System.Text.Json;
using StakeholderConsultations.Web;

namespace StakeholderConsultations.Web.Tests;

public sealed class SubmissionValidatorTests
{
    [Theory]
    [InlineData(1)]
    [InlineData(120)]
    public void AcceptsFieldCountBoundaries(int count)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(
            Enumerable.Range(0, count).ToDictionary(i => $"Q_{i}", _ => "answer"));
        Assert.Equal(count, SubmissionValidator.Parse(json).Count);
    }

    [Fact]
    public void AcceptsPrimitiveValuesAndMaximumKeyLength()
    {
        var json = "{\"" + new string('A', 64) + "\":\"café\",\"N\":-2.5,\"B\":true,\"F\":false,\"Z\":null}";
        var answers = Parse(json);
        Assert.Equal("café", answers[new string('A', 64)].GetString());
        Assert.Equal(-2.5m, answers["N"].GetDecimal());
        Assert.True(answers["B"].GetBoolean());
        Assert.False(answers["F"].GetBoolean());
        Assert.Equal(JsonValueKind.Null, answers["Z"].ValueKind);
    }

    [Theory]
    [InlineData(5000, true)]
    [InlineData(5001, false)]
    public void EnforcesAnswerLength(int length, bool valid)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(new { Q1 = new string('a', length) });
        if (valid) Assert.Single(SubmissionValidator.Parse(json));
        else Assert.Equal(400, Assert.Throws<SubmissionException>(() => SubmissionValidator.Parse(json)).StatusCode);
    }

    [Theory]
    [InlineData(20000, true)]
    [InlineData(20001, false)]
    public void EnforcesBodyByteBoundary(int length, bool valid)
    {
        var json = Encoding.UTF8.GetBytes("{\"Q\":1}".PadRight(length));
        if (valid) Assert.Single(SubmissionValidator.Parse(json));
        else Assert.Equal(413, Assert.Throws<SubmissionException>(() => SubmissionValidator.Parse(json)).StatusCode);
    }

    [Fact]
    public void BodyLimitCountsUtf8Bytes()
    {
        var json = Encoding.UTF8.GetBytes("{\"A\":\"" + new string('中', 4000) +
            "\",\"B\":\"" + new string('中', 4000) + "\"}");
        Assert.Equal(413, Assert.Throws<SubmissionException>(() => SubmissionValidator.Parse(json)).StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("{")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("true")]
    [InlineData("42")]
    [InlineData("{}")]
    [InlineData("{\"Q\":{}}")]
    [InlineData("{\"Q\":[]}")]
    [InlineData("{\"\":1}")]
    [InlineData("{\"bad-name\":1}")]
    [InlineData("{\"café\":1}")]
    [InlineData("{\"A\\n\":1}")]
    [InlineData("{\"Q\":1,\"Q\":2}")]
    [InlineData("{\"Q\":NaN}")]
    [InlineData("{\"Q\":1,}")]
    [InlineData("{\"Q\":\"\\uD800\"}")]
    [InlineData("{\"\\uD800\":1}")]
    public void RejectsInvalidPayloads(string json) =>
        Assert.Equal(400, Assert.Throws<SubmissionException>(() => Parse(json)).StatusCode);

    [Fact]
    public void RejectsTooManyFields()
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(
            Enumerable.Range(0, 121).ToDictionary(i => $"Q_{i}", _ => ""));
        Assert.Throws<SubmissionException>(() => SubmissionValidator.Parse(json));
    }

    [Fact]
    public void RejectsTooLongFieldName() =>
        Assert.Throws<SubmissionException>(() => Parse("{\"" + new string('A', 65) + "\":1}"));

    private static Dictionary<string, JsonElement> Parse(string json) =>
        SubmissionValidator.Parse(Encoding.UTF8.GetBytes(json));
}
