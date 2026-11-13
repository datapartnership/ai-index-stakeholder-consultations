# syntax=docker/dockerfile:1

# Run the SDK on the builder's architecture, including when cross-publishing ARM64.
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG TARGETARCH
WORKDIR /source

COPY src/StakeholderConsultations.Web/StakeholderConsultations.Web.csproj src/StakeholderConsultations.Web/
RUN dotnet restore src/StakeholderConsultations.Web/StakeholderConsultations.Web.csproj --arch "$TARGETARCH"

COPY src/StakeholderConsultations.Web/ src/StakeholderConsultations.Web/
RUN dotnet publish src/StakeholderConsultations.Web/StakeholderConsultations.Web.csproj \
    --configuration Release \
    --arch "$TARGETARCH" \
    --no-restore \
    --self-contained false \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
COPY --from=build /app/publish/ ./
USER $APP_UID
ENTRYPOINT ["dotnet", "StakeholderConsultations.Web.dll"]
