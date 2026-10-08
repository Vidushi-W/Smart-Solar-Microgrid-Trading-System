// Sign-in is served by the account API on port 5000, separate from this reservation host.
// In Development this process starts that API when it is not already running,
// and stops it again on shutdown, so login still works after a restart.
using System.Diagnostics;
using System.Net.Sockets;

namespace SolarMicrogrid.API.Configuration;

public static class DevelopmentAccountApi
{
    private const int AccountApiPort = 5000;

    public static void EnsureStarted(WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            return;
        }

        if (IsListening())
        {
            Console.WriteLine("Account API is already running on http://localhost:5000.");
            return;
        }

        var projectPath = FindProjectPath();
        if (projectPath is null)
        {
            Console.WriteLine("Account API project was not found. Sign-in needs http://localhost:5000.");
            return;
        }

        Process? process;
        try
        {
            process = Process.Start(new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"run --project \"{projectPath}\" --launch-profile SolarMicrogridTrading.Api",
                WorkingDirectory = Path.GetDirectoryName(projectPath)!,
                UseShellExecute = false,
            });
        }
        catch (Exception exception)
        {
            app.Logger.LogWarning("Could not start the account API ({ExceptionType}).", exception.GetType().Name);
            Console.WriteLine("Could not start the account API. Sign-in needs http://localhost:5000.");
            return;
        }

        if (process is null)
        {
            Console.WriteLine("Could not start the account API. Sign-in needs http://localhost:5000.");
            return;
        }

        app.Lifetime.ApplicationStopping.Register(() => Stop(process));

        if (!WaitUntilListening(process, TimeSpan.FromSeconds(120)))
        {
            Console.WriteLine("Account API did not start on http://localhost:5000. Sign-in will fail until it is running.");
            return;
        }

        Console.WriteLine("Account API is running on http://localhost:5000.");
    }

    // Stop only the process this host started, including the app it launched.
    private static void Stop(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch (Exception)
        {
            // The account API may already have exited.
        }
    }

    private static bool WaitUntilListening(Process process, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (process.HasExited)
            {
                return false;
            }

            if (IsListening())
            {
                return true;
            }

            Thread.Sleep(500);
        }

        return IsListening();
    }

    // Kestrel may bind IPv4, IPv6, or both when the URL uses localhost.
    private static bool IsListening()
    {
        return CanConnect("127.0.0.1") || CanConnect("::1");
    }

    private static bool CanConnect(string host)
    {
        try
        {
            using var client = new TcpClient();
            var connect = client.ConnectAsync(host, AccountApiPort);
            if (!connect.Wait(TimeSpan.FromMilliseconds(300)))
            {
                return false;
            }

            return client.Connected;
        }
        catch (Exception)
        {
            return false;
        }
    }

    // The account project lives beside this host, under backend/src.
    private static string? FindProjectPath()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (directory is not null)
        {
            var besideBackend = Path.Combine(directory.FullName, "src", "SmartSolar.Microgrid.Api.csproj");
            if (File.Exists(besideBackend))
            {
                return besideBackend;
            }

            var fromRepository = Path.Combine(directory.FullName, "backend", "src", "SmartSolar.Microgrid.Api.csproj");
            if (File.Exists(fromRepository))
            {
                return fromRepository;
            }

            directory = directory.Parent;
        }

        return null;
    }
}
