namespace SportHub.Tests;

public sealed class SqlServerFactAttribute : FactAttribute
{
    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SPORTHUB_TEST_CONNECTION")))
            Skip = "Set SPORTHUB_TEST_CONNECTION to run SQL Server integration tests.";
    }
}
