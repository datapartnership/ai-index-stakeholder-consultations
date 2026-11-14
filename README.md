# Stakeholder Consultations

The AI Index stakeholder survey: a static frontend (plain HTML, CSS, and JavaScript, no build step) published to GitHub Pages, and an API-only ASP.NET Core 10 backend published to GHCR as a container image. Responses are stored in Azure SQL (or SQL Server) and can be downloaded through a protected CSV endpoint.

## Project layout

- `frontend/`: the public survey (`index.html`, `style.css`, `config.js`, `questions.js`, `survey.js`, `charts.js`, `story.js`) and O*NET JSON data. Deployed to GitHub Pages.
- `src/StakeholderConsultations.Web/`: the `net10.0` API, EF Core model, and migrations. It serves no static files.
- `tests/StakeholderConsultations.Web.Tests/`: API, validation, CSV, hosting, and optional real SQL integration tests.
- `build_onet_data.py`: rebuilds browser data from an O*NET database download. JSON defaults to `frontend/data/`; CSV defaults to the non-public `data/soc_tasks.csv`. Override with `--out <json-directory>` and `--csv-out <csv-file>`.
- `worker.js`: historical Cloudflare reference only; it is not used by this application.

Only `frontend/` is published to Pages. Repository documents, archives, raw data, reference code, and application configuration are outside it. Edit `frontend/questions.js` to change survey content; preserve existing question codes once responses exist.

## Run locally

Requirements: the .NET 10 SDK and a reachable SQL Server or Azure SQL database. On macOS, use a remote SQL Server/Azure SQL database; Windows LocalDB connection strings do not work on macOS.

From the repository root:

```sh
dotnet restore
dotnet tool restore

dotnet user-secrets set "ConnectionStrings:SurveyDatabase" '<your SQL Server or Azure SQL connection string>' --project src/StakeholderConsultations.Web
dotnet user-secrets set "Survey:ExportKey" '<a long random export secret>' --project src/StakeholderConsultations.Web
dotnet user-secrets set "Survey:AccessPassword" '<the password you share with stakeholders>' --project src/StakeholderConsultations.Web

dotnet run --project src/StakeholderConsultations.Web
```

Then serve the frontend from a second terminal and point it at the local API by setting `window.SURVEY_API_BASE = "http://localhost:5080";` in `frontend/config.js` (don't commit that change):

```sh
python3 -m http.server --directory frontend 8000
```

Open <http://localhost:8000>. `appsettings.Development.json` already allows `http://localhost:8000` and `http://127.0.0.1:8000` as CORS origins. With `SURVEY_API_BASE` left empty, the page runs in test mode and shows the payload instead of sending it. User secrets are loaded in Development. Environment-variable equivalents are `ConnectionStrings__SurveyDatabase`, `Survey__ExportKey` and `Survey__AccessPassword`. Do not commit credentials or pass them as URL parameters.

## Survey password

When `Survey:AccessPassword` (env var `Survey__AccessPassword`) is set, submissions are password-protected. The page, scripts, and `data/*.json` files on GitHub Pages are public; only `POST /api/responses` is gated.

- On load, the frontend calls `GET /api/access` (`{ "required": true|false }`). If a password is required and the browser has no token yet, it shows a password prompt instead of the survey.
- The prompt posts `{ "password": "…" }` as JSON to `POST /api/login`, which returns `{ "ok": true, "token": "…" }` or `401`. The frontend keeps the token in `localStorage` and sends it as `Authorization: Bearer <token>` with each submission. A bearer header is used instead of a cookie because a cookie from the API's domain would be a third-party cookie on `github.io`, which browsers block.
- `/api/responses` returns `401` with `{ "ok": false, "error": "Password required" }` without a valid token; the frontend then asks for the password again and keeps the answers.
- `/api/export` isn't affected; it still uses only `X-Export-Key`.
- Login attempts are limited to 20 per minute per client IP; extra attempts get `429`. Logins from origins that are neither the API itself nor in `Cors:AllowedOrigins` get `403`.
- The token is derived from the password, so it keeps working across restarts and instances. **Changing the password signs everyone out**; they need the new password to continue.
- If the setting is empty or missing, submissions are public and startup logs a warning.

## CORS

The frontend and API live on different origins, so the API allows cross-origin requests only from origins listed in `Cors:AllowedOrigins`:

```sh
Cors__AllowedOrigins__0=https://datapartnership.github.io
# or, as one comma-separated value:
Cors__AllowedOrigins=https://datapartnership.github.io,https://survey.example.org
```

Entries are reduced to scheme, host, and port, so pasting the full Pages URL (`https://datapartnership.github.io/ai-index-stakeholder-consultations/`) also works. Allowed methods are `GET` and `POST`; allowed request headers are `Content-Type`, `Authorization`, and `X-Export-Key`. Credentials (cookies) are never allowed. With no origins configured, only same-origin and non-browser requests are accepted.

When `ConnectionStrings:SurveyDatabase` is configured, the application applies pending EF Core migrations at startup before accepting requests. On the first run, this creates the `Responses` table, its index, and the EF migration history. Later starts apply only pending migrations and preserve existing responses. The database account must have permission to create and update the schema. If the configured database is unavailable or a migration fails, startup fails so the container can report the problem and be restarted after it is resolved.

Without a connection string, startup skips migrations and the homepage remains available; submissions and authorized exports return `503` until SQL is configured.

## Backend contract

`POST /api/responses` accepts UTF-8 JSON with `Content-Type: text/plain` (the existing browser format) or `application/json`, including a charset parameter.

- The body must be a flat JSON object with 1–120 fields, at most 20,000 UTF-8 bytes, including requests without a Content-Length header.
- Field names must match `^[A-Za-z0-9_]{1,64}$`. Duplicate keys are rejected. Values may be strings (at most 5,000 UTF-16 code units), numbers, booleans, or null; objects and arrays are rejected.
- Browser requests must come from the API's own origin or an origin in `Cors:AllowedOrigins`. Requests without an Origin header are accepted. Other or malformed origins return `403` without CORS headers.
- Successful persistence returns `200` with `{ "ok": true }`. Failures return `{ "ok": false, "error": "..." }`: `400` for invalid JSON/fields, `413` for oversized bodies, `415` for unsupported media types, `401` when the survey password is enabled and the bearer token is missing or out of date, and `503` for storage failures.
- Responses contain a server-generated GUID, server UTC receipt timestamp, and the answers in an `nvarchar(max)` JSON column. Submitted `responseId` and `receivedAt` fields are discarded; client `submittedAt` is retained as an answer. New question codes need no database migration.
- No visitor IP addresses, user agents, request bodies, or export credentials are recorded by application logging. SQL sensitive-data logging is not enabled. Azure/platform access logging is configured separately.
- The frontend retains answers on the page after a failed request so the respondent can retry. Each successful POST creates a new response; retries are not deduplicated.

Example body:

```json
{
  "responseId": "client-generated-id",
  "submittedAt": "2026-11-02T10:15:00.000Z",
  "surveyVersion": "2026-11",
  "USE_REL": "Yes",
  "USE_HOW": "We track informal-sector work…",
  "CMB_P1_IND": "Use Case × Work Activities × Language",
  "CMB_P1_WHY": "…"
}
```

## Download responses

`GET /api/export` requires the configured secret in the `X-Export-Key` header. With your secret already available in a shell variable:

```sh
curl --fail --header "X-Export-Key: $SURVEY_EXPORT_KEY" \
  http://localhost:5080/api/export --output survey-responses.csv
```

An unset/blank server export key disables the endpoint with `503`; missing or incorrect credentials return `401`. Query-string keys are not accepted. All export responses have `Cache-Control: no-store`.

The download is UTF-8 CSV with a BOM and CRLF record separators, named `survey-responses.csv`. Columns start with authoritative `responseId` and `receivedAt`, followed by every observed answer field in first-seen order. Responses are ordered by receipt time, then ID. Missing/null values are empty cells. Quotes, commas, newlines, and Unicode are preserved; strings beginning with spreadsheet formula characters or tab/newline controls are prefixed with an apostrophe (including formulas after leading whitespace). Numeric values remain numeric. An empty database exports just the metadata header.

The export assembles all responses in memory; it is intended for this consultation survey's response volume.

## Test and publish

```sh
dotnet test
dotnet publish src/StakeholderConsultations.Web -c Release -o artifacts/publish
```

API/CSV/hosting tests run without a database using a test response store. The real SQL integration test is skipped unless `SURVEY_TEST_SQL_CONNECTION` is set to a **dedicated test database**. When set, it verifies automatic startup migration, posts a uniquely marked response through the real SQL store, checks persistence/export, restarts the app to verify existing data is preserved, and deletes only that test response. Database provisioning is not included.

Startup handles schema migration automatically. To review the SQL or apply migrations manually before startup, optionally generate an idempotent migration script:

```sh
mkdir -p artifacts
dotnet ef migrations script --idempotent --project src/StakeholderConsultations.Web --startup-project src/StakeholderConsultations.Web --output artifacts/migrations.sql
```

If applying the script manually, startup will recognize the recorded migrations and skip them. The runtime account needs schema migration permissions in addition to read/insert access to the Responses table. Never point integration tests at production.

## Docker

Build from the repository root:

```sh
docker build --pull -t stakeholder-consultations:local .
docker run --rm --name stakeholder-consultations -p 8080:8080 \
  -e ConnectionStrings__SurveyDatabase -e Survey__ExportKey -e Survey__AccessPassword -e Cors__AllowedOrigins \
  stakeholder-consultations:local
```

<http://localhost:8080> returns `{ "ok": true, "service": "survey-api" }`. The image serves only the API, runs as the .NET image's non-root user, and listens on container port `8080`. The SDK is used only in the build stage; the final image contains the ASP.NET Core runtime and published application.

Set `ConnectionStrings__SurveyDatabase`, `Survey__ExportKey`, `Survey__AccessPassword` and `Cors__AllowedOrigins` in your shell or deployment platform before running the container. The `-e NAME` options forward those environment variables without embedding their values in the image. The database must be reachable from inside the container; `localhost` refers to the container itself. The container automatically creates or updates the schema at startup using the configured database account, which must have schema migration permissions. Without SQL configuration, the API still starts and submissions return `503`.

The Docker build context includes only the web project, excluding the frontend, local build output, local settings, credential files, documents, and raw O*NET downloads.

## GitHub Pages

The `pages` job in `.github/workflows/deploy.yml` publishes `frontend/` to GitHub Pages after the tests pass, on pushes to `main` (and manual runs on that branch). Before uploading, it overwrites `frontend/config.js` with the `API_BASE_URL` repository variable, so the published page talks to the deployed API. Pull requests and other branches don't deploy.

One-time setup:

1. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
2. **Settings → Environments → `github-pages`:** allow the `main` branch under deployment branch rules.
3. **Settings → Secrets and variables → Actions → Variables:** add `API_BASE_URL` with the backend's public `https://` URL (no trailing `/api`). The job fails if it is missing or not `https://`.
4. On the backend, set `Cors__AllowedOrigins__0=https://datapartnership.github.io`.

The site is served at <https://datapartnership.github.io/ai-index-stakeholder-consultations/>.

## GitHub Container Registry

The workflow in `.github/workflows/deploy.yml` tests the application before building Linux AMD64 and ARM64 images. It publishes to:

```text
ghcr.io/datapartnership/ai-index-stakeholder-consultations
```

- Pushes to `main` publish `main`, `latest`, and `sha-<full-commit-SHA>` tags. `latest` is reserved for the repository's default branch.
- Pushes to `deployment` publish `deployment` and the commit SHA tag.
- Version tags such as `v1.2.3` publish `1.2.3`, `1.2`, and the commit SHA tag.
- Pull requests targeting either branch test and build the image without logging in to GHCR or publishing.
- The workflow can also be run manually from GitHub Actions for a selected branch or tag.

Authentication uses the automatically supplied `GITHUB_TOKEN` with `packages: write`; no personal access token or extra publishing secret is required. The image name is derived from the repository and normalized to lowercase, so forks publish under their own namespace. If a GHCR package already exists, grant this repository Actions write access in that package's settings. Package visibility is managed in GHCR.

Once the workflow has published an image:

```sh
docker pull ghcr.io/datapartnership/ai-index-stakeholder-consultations:latest
docker run --rm -p 8080:8080 \
  -e ConnectionStrings__SurveyDatabase -e Survey__ExportKey -e Survey__AccessPassword -e Cors__AllowedOrigins \
  ghcr.io/datapartnership/ai-index-stakeholder-consultations:latest
```

Authenticate with `docker login ghcr.io` first when pulling a private package. Image publication does not deploy the app or contact the database; schema migration runs when the deployed container starts.

## Azure App Service

1. Use a .NET 10 Azure App Service on Windows or Linux and an existing Azure SQL database reachable from that app.
2. Configure `ConnectionStrings__SurveyDatabase`, `Survey__ExportKey`, `Survey__AccessPassword` and `Cors__AllowedOrigins__0` (the Pages origin) as App Service environment settings. Set `ASPNETCORE_ENVIRONMENT=Production`, enable HTTPS Only, and set `AllowedHosts` to the app hostname (semicolon-separated if using multiple domains).
3. For Linux App Service HTTPS proxy termination, set `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` in the managed App Service environment so the application sees the external HTTPS scheme for same-origin checks. Windows/IIS uses ASP.NET Core's IIS integration. If hosting behind a different proxy, explicitly configure trusted forwarding for that environment.
4. Deploy the **contents** of `artifacts/publish/` as one app, including the DLLs and configuration (or run the GHCR image). The app applies pending database migrations on startup, so its configured database account needs schema migration permissions. Linux startup is `dotnet StakeholderConsultations.Web.dll`; it must not use the previous Node/PM2 static-server command.
5. For Windows/IIS, use the `web.config` generated by `dotnet publish`. The old static-only repository `web.config` has been removed.
6. Check that `/` returns `{ "ok": true }` and `/api/access` responds. From the Pages site, submit a test response, confirm it appears in the protected export, and verify `/appsettings.json`, `/index.html`, and unknown routes return `404`.

This repository change does not provision cloud resources, deploy the app, or import existing Cloudflare responses.

## Question codes

Every indicator and every question in `questions.js` has a `code`. Each answer is sent under the key **`<indicator code>_<question code>`**. On the page, each question's container also carries the same code as a `data-code` attribute.

- **Fixed fields:** `responseId` (random id from the browser), `submittedAt` (browser time, ISO 8601) and `surveyVersion` (from `questions.js`) are always sent.
- **Every question is always sent:** unanswered questions, and questions hidden by a condition, are sent as `""`.
- **Single choice and scale:** the chosen option text, exactly as listed below.
- **Multiple choice:** chosen options joined with `"; "`.
- **"Other" options:** the main answer is `"Other"`, and the typed text goes in the matching `_OTH` key.

**Rules for editing:** never change or reuse a code once responses exist. A new question gets the next unused number (e.g. `SKL_Q5`). When questions change, bump `surveyVersion`, and add the new rows to the table below.

### Indicator codes

| Code | Indicator |
| --- | --- |
| `RSP` | About the respondent (top of the survey, `aboutQuestions` in `frontend/questions.js`) |
| `USE` | Use Case |
| `ACT` | Work Activities |
| `OCC` | Occupational Topic |
| `IND` | Industry |
| `PRF` | Proficiency |
| `LNG` | Language of Interaction |
| `CMB` | Combined indicators (priority list, and one open question about other datasets) |

Codes of removed indicators and questions (`CHR`, `SKL`, `AUT`, `TGN`, `TOU`, `FWC`, `ACT_Q1`, `ACT_Q2`, `ACT_Q3`–`ACT_Q5`) are retired: do not reuse them.

`REL` and `HOW` are shared questions that most indicators ask:

- `REL`: "Is this indicator relevant for policy, development investment, or research?" (Yes / Somewhat / No / Not sure)
- `HOW`: "Is this useful to you? How would you use it? Which datasets would you combine this with?" (free text)

`OCC_Q1` and `OCC_Q3` are retired and must not be reused.

### Codebook

| Code | Indicator | Type | Question |
| --- | --- | --- | --- |
| `RSP_Q1` | About the respondent | text | Which sector do you work in? |
| `USE_REL` | Use Case | scale | Is this indicator relevant for policy, development investment, or research? |
| `USE_HOW` | Use Case | textarea | Is this useful to you? How would you use it? Which datasets would you combine this with? |
| `USE_Q1` | Use Case | textarea | Does this definition of work cover all forms of work in low- and middle-income countries? |
| `USE_Q2` | Use Case | textarea | Do you have suggestions on activity categorizations for education and personal use that translate to low- and middle-income countries? |
| `ACT_REL` | Work Activities | scale | Is this indicator relevant for policy, development investment, or research? |
| `ACT_HOW` | Work Activities | textarea | Is this useful to you? How would you use it? Which datasets would you combine this with? |
| `ACT_Q6` | Work Activities | textarea | Can you study AI exposure in low- and middle-income countries using activities from O*NET? |
| `OCC_REL` | Occupational Topic | scale | Is this indicator relevant for policy, development investment, or research? |
| `OCC_HOW` | Occupational Topic | textarea | Is this useful to you? How would you use it? Which datasets would you combine this with? |
| `OCC_Q2` | Occupational Topic | textarea | This classification mixes 2 digit and 3 digit ISCO Occupation Levels. Would you be able to use it within your research? |
| `IND_REL` | Industry | scale | Is this indicator relevant for policy, development investment, or research? |
| `IND_HOW` | Industry | textarea | Is this useful to you? How would you use it? Which datasets would you combine this with? |
| `PRF_REL` | Proficiency | scale | Is this indicator relevant for policy, development investment, or research? |
| `PRF_HOW` | Proficiency | textarea | Is this useful to you? How would you use it? Which datasets would you combine this with? |
| `PRF_Q1` | Proficiency | single | Which option is better suited to classify chats by this indicator? <br>Options: Option 1: Domain expertise / Option 2: Education level / None of these / Not sure |
| `LNG_REL` | Language of Interaction | scale | Is this indicator relevant for policy, development investment, or research? |
| `LNG_HOW` | Language of Interaction | textarea | Is this useful to you? How would you use it? Which datasets would you combine this with? |
| `CMB_P1_IND` … `CMB_P5_IND` | Combined indicators | text | Priority combinations 1–5, in the respondent's order: the indicators picked, joined with " × " (e.g. "Use Case × Language") |
| `CMB_P1_WHY` … `CMB_P5_WHY` | Combined indicators | textarea | For each priority: Why is this combination a priority for your work? |
| `CMB_Q1` | Combined indicators | textarea | What other datasets would you combine these indicators with? |

Up to 5 priorities can be added (`maxPriorities` in `questions.js`). Unused slots are sent as `""`.

## Other notes

- **Spam protection:** a hidden "Leave this field empty" input. If a bot fills it in, the page shows "thank you" but sends nothing.
- **Answers in progress:** kept in memory only, never in browser storage. Closing or reloading the page clears them. Nothing is sent until **Submit feedback** is pressed.
- **O*NET data:** to rebuild `data/` for a new O*NET release, run `python3 build_onet_data.py <folder-or-zip> --release "31.0" --date "August 2026"`.
