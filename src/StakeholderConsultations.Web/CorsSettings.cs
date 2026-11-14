using Microsoft.AspNetCore.Cors.Infrastructure;

namespace StakeholderConsultations.Web;

/// <summary>
/// Cross-origin access for the separately hosted frontend (GitHub Pages). Allowed origins come from
/// <c>Cors:AllowedOrigins</c>, either as an array (<c>Cors__AllowedOrigins__0=https://…</c>) or as one
/// comma-separated value (<c>Cors__AllowedOrigins=https://a,https://b</c>). Entries are reduced to
/// scheme, host and port, so pasting a full Pages URL such as <c>https://org.github.io/repo/</c> works.
/// Credentials (cookies) are never allowed; the survey password travels as a bearer token instead.
/// </summary>
public static class CorsSettings
{
    public const string AllowedOriginsKey = "Cors:AllowedOrigins";

    public static IServiceCollection AddSurveyCors(this IServiceCollection services)
    {
        services.AddCors();
        // Resolved lazily so configuration added after Program.cs runs (e.g. by tests) is honoured.
        services.AddOptions<CorsOptions>().Configure<IConfiguration>((options, configuration) =>
        {
            var allowed = AllowedOrigins(configuration);
            options.AddDefaultPolicy(policy => policy
                .SetIsOriginAllowed(origin => Normalize(origin) is { } o && allowed.Contains(o))
                .WithMethods(HttpMethods.Get, HttpMethods.Post)
                .WithHeaders("Content-Type", "Authorization", "X-Export-Key")
                .WithExposedHeaders("Content-Disposition")
                .SetPreflightMaxAge(TimeSpan.FromMinutes(10)));
        });
        return services;
    }

    public static HashSet<string> AllowedOrigins(IConfiguration configuration)
    {
        var section = configuration.GetSection(AllowedOriginsKey);
        var entries = section.GetChildren().Select(child => child.Value).Append(section.Value)
            .SelectMany(value => (value ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        return entries.Select(Normalize).OfType<string>().ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>Returns <c>scheme://host[:port]</c> (default ports omitted), or null when not an http(s) URL.</summary>
    public static string? Normalize(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https" && uri.UserInfo.Length == 0
            ? uri.GetLeftPart(UriPartial.Authority).ToLowerInvariant()
            : null;
}
