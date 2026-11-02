# Stakeholder Consultations

A static web survey that asks stakeholders which AI-use indicators matter most, and how they should be measured. It opens with a short scrolling story, then has two tabs: **Individual indicators** and **Combined indicators**.

The front end is plain HTML, CSS and JavaScript, with no build step. Responses are sent as JSON to a backend endpoint; for production, that backend runs on **Azure App Service**.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell and the scrolling story text |
| `questions.js` | **All survey content**: indicators, taxonomies, questions, question codes, endpoint URL |
| `survey.js` | Survey engine: renders questions, validates, builds and sends the response |
| `charts.js` | Charts (donut, split bar, treemap, small multiples) |
| `story.js` | Scrolling story: pinning, slide changes and arrows |
| `style.css` | All styling |
| `data/` | O*NET data used by the Work Activity explorer (`onet_activities.json`, `soc_tasks.json`) |
| `build_onet_data.py` | Rebuilds the `data/` files from an O*NET database download |
| `worker.js` | Reference backend for Cloudflare Workers + D1; use it as the spec for the Azure backend |

To change wording or questions, edit `questions.js` only.

<!-- ## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. The page must be served over HTTP, not opened as a file, because the O*NET data is loaded with `fetch`.

While `endpointUrl` in `questions.js` is still `PASTE_YOUR_ENDPOINT_URL_HERE`, the survey runs in **test mode**: nothing is sent, and **Submit feedback** shows the exact JSON that would be sent. There is no on-page banner for this, so check `endpointUrl` before going live. -->

## Deploy on Azure App Service

### 1. Host the front end

The front end is static files: `index.html`, `*.js`, `style.css`, `web.config` and `data/`. Deploy them to the web app's `wwwroot` with zip deploy, GitHub Actions or the VS Code Azure extension.

- **`data/onet_activities.json` and `data/soc_tasks.json` must be deployed.** Without them, only the 41 GWAs appear (a built-in fallback), and the IWA, DWA and Task views stay empty. Both files are committed to the repository; `.gitignore` only excludes the raw O*NET download and the CSV.
- **Windows App Service:** IIS serves the static files. `web.config` makes sure IIS serves `.json` files.
- **Linux App Service (Node runtime):** set the startup command to `pm2 serve /home/site/wwwroot --no-daemon`. `web.config` is ignored there.
- Do **not** deploy `worker.js`, `build_onet_data.py`, `data/db_31_0_excel/` or `data/soc_tasks.csv`. They aren't needed by the page.
- **Check after publishing:** open `https://<your-app>/data/onet_activities.json` in a browser. It should show JSON, not a 404 error.

Azure Static Web Apps is a lighter alternative if the backend is hosted separately.

### 2. Point the survey at the backend

In `questions.js`, set:

```js
endpointUrl: "https://<your-app>.azurewebsites.net/api/responses",
```

If the backend is in the same App Service as the front end, a relative path such as `"/api/responses"` works, and no CORS setup is needed.

### 3. Backend contract

The survey sends **one request per submission**:

- **Method:** `POST`
- **Header:** `Content-Type: text/plain`. This keeps it a "simple" request, so browsers send no CORS preflight.
- **Body:** a flat JSON object. Every value is a string, and every key is a question code (see below).
- **Success:** any `2xx` status. Anything else shows an error, and the respondent can retry; their answers stay on the page.

Recommended backend behaviour, matching `worker.js`:

| Rule | Value |
| --- | --- |
| Allowed origin (CORS) | Only the survey's own origin |
| Max request size | 20,000 bytes |
| Max number of fields | 120 (the survey currently sends 56) |
| Max length per value | 5,000 characters |
| Key format | `^[A-Za-z0-9_]{1,64}$`; reject anything else |
| Values | String, number, boolean or null only |
| Stored per response | Server-generated id, server timestamp, and the answers. No IP addresses or user agents |
| CSV/Excel export | Prefix values starting with `= + - @` with `'` so spreadsheets don't run them as formulas |

Store answers so that new codes need no schema change: for example, a JSON column in Azure SQL, or one document per response in Cosmos DB / Table Storage.

### Example request body

```json
{
  "responseId": "3f1c…",
  "submittedAt": "2026-11-02T10:15:00.000Z",
  "surveyVersion": "2026-11",
  "USE_REL": "Yes",
  "USE_HOW": "We track informal-sector work…",
  "ACT_Q1": "Option 1",
  "ACT_Q2": "Intermediate Work Activities (IWAs)",
  "CHR_Q1": "Age; Gender; Income",
  "SKL_Q3": "Other",
  "SKL_Q3_OTH": "ESCO skills",
  "CMB_P1_IND": "Use Case × Work Activity × Language",
  "CMB_P1_WHY": "…"
}
```

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
| `RSP` | About the respondent (top of the survey, `aboutQuestions` in `questions.js`) |
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
- **Drafts:** answers in progress are kept in the browser's `localStorage` on the respondent's own device, and cleared after a successful submit. They are never sent anywhere until **Submit feedback** is pressed.
- **O*NET data:** to rebuild `data/` for a new O*NET release, run `python3 build_onet_data.py <folder-or-zip> --release "31.0" --date "August 2026"`.