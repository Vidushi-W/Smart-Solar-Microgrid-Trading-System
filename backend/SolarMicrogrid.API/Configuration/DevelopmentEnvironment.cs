namespace SolarMicrogrid.API.Configuration;

public static class DevelopmentEnvironment
{
    public static void Load()
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        if (!string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (directory is not null)
        {
            var envFile = Path.Combine(directory.FullName, ".env");
            if (File.Exists(envFile))
            {
                DotNetEnv.Env.Load(envFile);
                return;
            }

            directory = directory.Parent;
        }
    }
}
