# Stakeholder Consultations

An ASP.NET Core 10 application hosting the AI Index stakeholder survey and its backend on the same origin. The existing frontend is plain HTML, CSS, and JavaScript, with no frontend build step. Responses are stored in Azure SQL (or SQL Server) and can be downloaded through a protected CSV endpoint.

## Project layout

- `src/StakeholderConsultations.Web/`: the `net10.0` application, API, EF Core model, and migrations.
- `src/StakeholderConsultations.Web/wwwroot/`: the public survey (`index.html`, `style.css`, `questions.js`, `survey.js`, `charts.js`, `story.js`) and O*NET JSON data.
- `tests/StakeholderConsultations.Web.Tests/`: API, validation, CSV, hosting, and optional real SQL integration tests.
- `build_onet_data.py`: rebuilds browser data from an O*NET database download. JSON defaults to `wwwroot/data/`; CSV defaults to the non-public `data/soc_tasks.csv`. Override with `--out <json-directory>` and `--csv-out <csv-file>`.
- `worker.js`: historical Cloudflare reference only; it is not used by this application.

Only `wwwroot/` is served publicly. Repository documents, archives, raw data, reference code, and application configuration are outside it. Edit `wwwroot/questions.js` to change survey content; preserve existing question codes once responses exist.

## Run locally

Requirements: the .NET 10 SDK and a reachable SQL Server or Azure SQL database. On macOS, use a remote SQL Server/Azure SQL database; Windows LocalDB connection strings do not work on macOS.

From the repository root:

```sh
dotnet restore
dotnet tool restore

dotnet user-secrets set "ConnectionStrings:SurveyDatabase" '<your SQL Server or Azure SQL connection string>' --project src/StakeholderConsultations.Web
dotnet user-secrets set "Survey:ExportKey" '<a long random export secret>' --project src/StakeholderConsultations.Web

dotnet run --project src/StakeholderConsultations.Web
```

Open <http://localhost:5080>. The frontend submits directly to `/api/responses`; no separate frontend server or CORS configuration is needed. User secrets are loaded in Development. Environment-variable equivalents are `ConnectionStrings__SurveyDatabase` and `Survey__ExportKey`. Do not commit credentials or pass them as URL parameters.

When `ConnectionStrings:SurveyDatabase` is configured, the application applies pending EF Core migrations at startup before accepting requests. On the first run, this creates the `Responses` table, its index, and the EF migration history. Later starts apply only pending migrations and preserve existing responses. The database account must have permission to create and update the schema. If the configured database is unavailable or a migration fails, startup fails so the container can report the problem and be restarted after it is resolved.

Without a connection string, startup skips migrations and the homepage remains available; submissions and authorized exports return `503` until SQL is configured.

## Backend contract

`POST /api/responses` accepts UTF-8 JSON with `Content-Type: text/plain` (the existing browser format) or `application/json`, including a charset parameter.

- The body must be a flat JSON object with 1–120 fields, at most 20,000 UTF-8 bytes, including requests without a Content-Length header.
- Field names must match `^[A-Za-z0-9_]{1,64}$`. Duplicate keys are rejected. Values may be strings (at most 5,000 UTF-16 code units), numbers, booleans, or null; objects and arrays are rejected.
- Browser requests must have the application's own origin. Requests without an Origin header are accepted. Foreign or malformed origins return `403`; cross-origin access is not enabled.
- Successful persistence returns `200` with `{ "ok": true }`. Failures return `{ "ok": false, "error": "..." }`: `400` for invalid JSON/fields, `413` for oversized bodies, `415` for unsupported media types, and `503` for storage failures.
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
  "ACT_Q1": "Option 1",
  "ACT_Q2": "Intermediate Work Activities (IWAs)",
  "CHR_Q1": "Age; Gender; Income",
  "CMB_P1_IND": "Use Case × Work Activity × Language",
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
  -e ConnectionStrings__SurveyDatabase -e Survey__ExportKey \
  stakeholder-consultations:local
```

Open <http://localhost:8080>. The image serves both the frontend and API, runs as the .NET image's non-root user, and listens on container port `8080`. The SDK is used only in the build stage; the final image contains the ASP.NET Core runtime and published application.

Set `ConnectionStrings__SurveyDatabase` and `Survey__ExportKey` in your shell or deployment platform before running the container. The `-e NAME` options forward those environment variables without embedding their values in the image. The database must be reachable from inside the container; `localhost` refers to the container itself. The container automatically creates or updates the schema at startup using the configured database account, which must have schema migration permissions. Without SQL configuration, the frontend still loads and submissions return `503`.

The Docker build context includes only the web project, excluding local build output, local settings, credential files, documents, and raw O*NET downloads. Both browser JSON datasets are included in the image.

## GitHub Container Registry

The workflow in `.github/workflows/container.yml` tests the application before building Linux AMD64 and ARM64 images. It publishes to:

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
  -e ConnectionStrings__SurveyDatabase -e Survey__ExportKey \
  ghcr.io/datapartnership/ai-index-stakeholder-consultations:latest
```

Authenticate with `docker login ghcr.io` first when pulling a private package. Image publication does not deploy the app or contact the database; schema migration runs when the deployed container starts.

## Azure App Service

1. Use a .NET 10 Azure App Service on Windows or Linux and an existing Azure SQL database reachable from that app.
2. Configure `ConnectionStrings__SurveyDatabase` and `Survey__ExportKey` as App Service environment settings. Set `ASPNETCORE_ENVIRONMENT=Production`, enable HTTPS Only, and set `AllowedHosts` to the app hostname (semicolon-separated if using multiple domains).
3. For Linux App Service HTTPS proxy termination, set `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` in the managed App Service environment so the application sees the external HTTPS scheme for same-origin checks. Windows/IIS uses ASP.NET Core's IIS integration. If hosting behind a different proxy, explicitly configure trusted forwarding for that environment.
4. Deploy the **contents** of `artifacts/publish/` as one app, including the DLLs, configuration, and `wwwroot/`. The app applies pending database migrations on startup, so its configured database account needs schema migration permissions. Linux startup is `dotnet StakeholderConsultations.Web.dll`; it must not use the previous Node/PM2 static-server command.
5. For Windows/IIS, use the `web.config` generated by `dotnet publish`. The old static-only repository `web.config` has been removed.
6. Check `/`, `/style.css`, `/survey.js`, `/data/onet_activities.json`, and `/data/soc_tasks.json`. Submit a test response, confirm it appears in the protected export, and verify `/appsettings.json`, `/worker.js`, and unknown routes return `404`.

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
| `RSP` | About the respondent (top of the survey, `aboutQuestions` in `wwwroot/questions.js`) |
| `CHR` | User Characteristics |
| `USE` | Use Case |
| `ACT` | Work Activity |
| `SKL` | Skills |
| `OCC` | Occupational field |
| `IND` | Industry |
| `AUT` | Automation vs Augmentation |
| `TGN` | Time Gains |
| `PRF` | Proficiency |
| `LNG` | Language of Interaction |
| `TOU` | Time of Use |
| `CMB` | Combined indicators (priority list) |
| `FWC` | Filter Work Chats (currently hidden; its answers are not sent) |

`REL` and `HOW` are shared questions that most indicators ask:

- `REL`: "Is this indicator relevant for policy, development investment, or research decisions?" (Yes / Somewhat / No / Not sure)
- `HOW`: "How is it relevant, and how would you use it?" (free text)

### Codebook

| Code | Indicator | Type | Question |
| --- | --- | --- | --- |
| `RSP_Q1` | About the respondent | text | Which sector do you work in? |
| `CHR_HOW` | User Characteristics | textarea | How is it relevant, and how would you use it? |
| `CHR_Q1` | User Characteristics | multiple (max 3) | Which of these is highest priority for you? (Choose up to 3) <br>Options: Age / Level of education / Urban or rural / Gender / User occupation / Income / Seniority and experience |
| `USE_REL` | Use Case | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `USE_HOW` | Use Case | textarea | How is it relevant, and how would you use it? |
| `USE_Q1` | Use Case | textarea | Does this definition of work cover all forms of work in LMICs? |
| `USE_Q2` | Use Case | textarea | Do you have suggestions on activity categorizations for education and personal use that translate to LMICs? |
| `ACT_REL` | Work Activity | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `ACT_Q1` | Work Activity | single | Which taxonomy option do you think is more suited? <br>Options: Option 1 / Option 2 / Not sure |
| `ACT_Q2` | Work Activity | single | Which of the 4 levels would be most useful to study the activities AI is used for? <br>Options: General Work Activities (GWAs) / Intermediate Work Activities (IWAs) / Detailed Work Activities (DWAs) / Tasks / Not sure <br>_Shown only if `ACT_Q1` = "Option 1"_ |
| `ACT_Q3` | Work Activity | textarea | Which Time Use Survey is best suited to measure global chat data? <br>_Shown only if `ACT_Q1` = "Option 2"_ |
| `ACT_Q4` | Work Activity | scale | Can education-related chats be measured using O*NET work activities? <br>Options: Yes / No / Not sure <br>_Shown only if `ACT_Q1` = "Option 2"_ |
| `ACT_Q5` | Work Activity | single | Which O*NET level is best suited to classify work-related chats? <br>Options: General Work Activities (GWAs) / Intermediate Work Activities (IWAs) / Detailed Work Activities (DWAs) / Tasks / Not sure <br>_Shown only if `ACT_Q1` = "Option 2"_ |
| `ACT_HOW` | Work Activity | textarea | How is it relevant, and how would you use it? |
| `ACT_Q6` | Work Activity | textarea | Can you study AI exposure in LMICs using activities from O*NET? |
| `SKL_REL` | Skills | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `SKL_HOW` | Skills | textarea | How is it relevant, and how would you use it? |
| `SKL_Q1` | Skills | single | Which is more important: the skills that the generative AI uses, or the skills the person is asking the generative AI to use? <br>Options: Skills the AI uses / Skills the person is asking the AI to use / Both equally / Not sure |
| `SKL_Q2` | Skills | scale | Do you require skills mapping if an activity mapping already exists? <br>Options: Yes / No / Not sure |
| `SKL_Q3` | Skills | single | Which option is better suited to classify chats by this indicator? <br>Options: Option 1: ILO core skills / Option 2: O*NET skills taxonomy / Option 3: LinkedIn skills categories / None of these / Other |
| `SKL_Q3_OTH` | Skills | text | Free text when "Other" is chosen in `SKL_Q3` |
| `SKL_Q4` | Skills | textarea | Why is that one better for your work? <br>_Shown only if `SKL_Q3` is answered_ |
| `OCC_REL` | Occupational field | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `OCC_HOW` | Occupational field | textarea | How is it relevant, and how would you use it? |
| `OCC_Q1` | Occupational field | textarea | Is 'occupational field' an indicator name you understand to mean 'topics related to this occupation'? |
| `OCC_Q2` | Occupational field | textarea | Is this 16-item list aggregated from ISCO occupations helpful in LMIC research? |
| `OCC_Q3` | Occupational field | textarea | Are you working with countries that are developing their own occupational taxonomies? Can they be mapped to ISCO, and then to this framework? |
| `IND_REL` | Industry | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `IND_HOW` | Industry | textarea | How is it relevant, and how would you use it? |
| `AUT_REL` | Automation vs Augmentation | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `AUT_HOW` | Automation vs Augmentation | textarea | How is it relevant, and how would you use it? |
| `AUT_Q1` | Automation vs Augmentation | textarea | Is this taxonomy useful? Do you have an alternative way to measure automation vs augmentation? |
| `TGN_REL` | Time Gains | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `TGN_HOW` | Time Gains | textarea | How is it relevant, and how would you use it? |
| `PRF_REL` | Proficiency | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `PRF_HOW` | Proficiency | textarea | How is it relevant, and how would you use it? |
| `PRF_Q1` | Proficiency | single | Which option is better suited to classify chats by this indicator? <br>Options: Option 1: Domain expertise / Option 2: Education level / None of these / Not sure |
| `LNG_REL` | Language of Interaction | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `LNG_HOW` | Language of Interaction | textarea | How is it relevant, and how would you use it? |
| `TOU_REL` | Time of Use | scale | Is this indicator relevant for policy, development investment, or research decisions? |
| `TOU_HOW` | Time of Use | textarea | How is it relevant, and how would you use it? |
| `TOU_Q1` | Time of Use | single | Which taxonomy option do you prefer? <br>Options: Option 1: Hourly bands + weekday/weekend / Option 2: 4-hourly bands with a weekday/weekend tag / Other |
| `TOU_Q1_OTH` | Time of Use | text | Free text when "Other" is chosen in `TOU_Q1` |
| `CMB_P1_IND` … `CMB_P5_IND` | Combined indicators | text | Priority combinations 1–5, in the respondent's order: the indicators picked, joined with " × " (e.g. "Use Case × Language") |
| `CMB_P1_WHY` … `CMB_P5_WHY` | Combined indicators | textarea | For each priority: Why is this combination a priority for your work? |

Up to 5 priorities can be added (`maxPriorities` in `questions.js`). Unused slots are sent as `""`.

## Other notes

- **Spam protection:** a hidden "Leave this field empty" input. If a bot fills it in, the page shows "thank you" but sends nothing.
- **Answers in progress:** kept in memory only, never in browser storage. Closing or reloading the page clears them. Nothing is sent until **Submit feedback** is pressed.
- **O*NET data:** to rebuild `data/` for a new O*NET release, run `python3 build_onet_data.py <folder-or-zip> --release "31.0" --date "August 2026"`.
