/*
  SURVEY CONFIGURATION
  ====================
  Edit this file to change the survey. You never need to touch index.html.

  flowUrl  – paste your Power Automate "When an HTTP request is received" URL here.
             While it is left as the placeholder, the page runs in TEST MODE:
             nothing is sent, and the JSON that *would* be sent is shown on screen.

  Question types:
    "single"    – pick one (radio buttons). Optional: allowOther: true
    "multiple"  – pick any (checkboxes).   Optional: allowOther: true
    "text"      – one-line answer
    "textarea"  – long answer
    "email"     – email address
    "number"    – number (optional min / max)
    "rating"    – 1..scale (optional scale, minLabel, maxLabel)

  Make a question appear only after a certain answer (dynamic logic):
    showIf: { question: "indicator", equals: "Inflation" }
    showIf: { question: "topics", includes: "Health" }     // for "multiple" questions
    showIf: { question: "indicator", answered: true }      // any answer at all

  Every question's "id" becomes a column name in the data sent to the flow,
  so keep ids short, lowercase, and without spaces (e.g. "indicator", "reason").
*/

window.SURVEY_CONFIG = {
  title: "Policy Research Indicators",
  intro: "Thank you for taking part. This short survey takes less than a minute.",

  flowUrl: "PASTE_YOUR_FLOW_URL_HERE",

  submitLabel: "Submit",
  thankYouTitle: "Thank you!",
  thankYouMessage: "Your response has been recorded.",

  questions: [
    {
      id: "indicator",
      type: "single",
      label: "Which indicator do you feel is most important to policy research?",
      required: true,
      // Placeholder options – replace with your own list.
      options: [
        "GDP growth",
        "Unemployment rate",
        "Inflation",
        "Poverty rate",
        "Income inequality",
        "Life expectancy",
        "Educational attainment"
      ],
      allowOther: true
    }
  ]
};