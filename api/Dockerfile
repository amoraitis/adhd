# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY api.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Expose port
EXPOSE 5180

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5180
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "api.dll"]
