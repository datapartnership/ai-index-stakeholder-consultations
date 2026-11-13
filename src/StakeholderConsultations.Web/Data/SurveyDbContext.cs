using Microsoft.EntityFrameworkCore;

namespace StakeholderConsultations.Web.Data;

public sealed class SurveyDbContext(DbContextOptions<SurveyDbContext> options) : DbContext(options)
{
    public DbSet<SurveyResponse> Responses => Set<SurveyResponse>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var response = modelBuilder.Entity<SurveyResponse>();
        response.ToTable("Responses");
        response.HasKey(r => r.Id);
        response.Property(r => r.Id).ValueGeneratedNever();
        response.Property(r => r.ReceivedAt).HasColumnType("datetimeoffset");
        response.Property(r => r.AnswersJson).HasColumnType("nvarchar(max)").IsRequired();
        response.HasIndex(r => r.ReceivedAt);
    }
}
