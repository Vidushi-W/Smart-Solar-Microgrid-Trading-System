// Result of the development database ping: whether MongoDB answered, and which database was checked.
namespace SolarMicrogrid.API.DTOs;

public record DatabaseStatusResponse(bool Connected, string Database);
