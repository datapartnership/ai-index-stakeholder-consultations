using Microsoft.EntityFrameworkCore;
using StakeholderConsultations.Web;
using StakeholderConsultations.Web.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<SurveyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SurveyDatabase"),
        sql => sql.EnableRetryOnFailure()));
builder.Services.AddScoped<ISurveyResponseStore, SqlSurveyResponseStore>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapSurveyEndpoints();

app.Run();

// Exposes the entry point to WebApplicationFactory without a second application host.
public partial class Program;
