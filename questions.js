/*
  SURVEY CONTENT
  ==============
  Edit this file to change the survey text and questions. You never need to touch
  index.html, style.css, charts.js or survey.js.

  endpointUrl  – where responses are sent (e.g. your Cloudflare Worker URL).
                 While it is left as the placeholder, the page runs in TEST MODE:
                 nothing is sent, and the data that *would* be sent is shown on screen.

  The page has three tabs:
    Objectives              – an introduction to the initiative and consultation.
    Single indicators       – `pages[0]`: a row of indicator buttons; each opens a split screen
                              (LEFT = what the data would look like, RIGHT = questions).
    Indicator combinations  – `combinations`: pick up to four indicators to see a Sankey chart,
                              then rank the combinations you need; plus a featured combination.

  THE LEFT SIDE OF AN INDICATOR (`show`) – every part is optional, shown in this order:
    summary:  "One sentence saying what the indicator measures"
    lead:     "Sentence introducing the example"
    explorer: { data: "data/onet_activities.json", tasks: "data/soc_tasks.json" }   // O*NET donut explorer
    chart:    { title, note, unit: "%", bars: [ { label, value } ] }                 // bar chart
    pillGroups: [ { title, note, sets: [ { label, pills: ["Pill", { code: "A", label: "Pill" }] } ] } ]
    heading:  "Heading above the text"
    text:     [ "Paragraph one", "Paragraph two" ]

  QUESTIONS ON THE RIGHT: `questionsBefore` (shown first), then `commonQuestions`, then `questions`.
  Question types: "scale" (row of buttons), "single" (radio list, allowOther: true),
                  "multiple" (checkboxes), "textarea", "text", "email", "number".
  Optional: hint, required: true, showIf: { question: "id", equals: "No" } (or answered: true).

  IDS: answers are saved as <indicator id>__<question id>. Don't change ids once responses arrive.
  LINK TO ONE INDICATOR: add #<indicator id> to the address, e.g. .../#work_activities
  LINK TO THE COMBINATIONS TAB: .../#combinations
*/

window.SURVEY_CONFIG = {
  siteTitle: "AI Index stakeholder consultation",

  endpointUrl: "PASTE_YOUR_ENDPOINT_URL_HERE",

  submitLabel: "Submit feedback",
  thankYouTitle: "Thank you for your feedback",
  thankYouMessage: "Your answers have been recorded. You can close this page.",
  country: "Country A",
  illustrativeNote: "Illustrative figures for an example country. Not real data.",

  pages: [
    {
      id: "adoption",
      type: "indicators",
      title: "Indicators relevant to studying characteristics of AI adoption",
      intro:
        "Choose an indicator to see the kind of measurement it would allow, then tell us whether it is useful for policy research. " +
        "Answer as many indicators as are relevant to your work.",

      commonQuestions: [
        { id: "relevant", type: "scale", label: "Is this a relevant indicator for policy?", options: ["Yes", "Somewhat", "No", "Not sure"] },
        { id: "how", type: "textarea", label: "How is it relevant?", hint: "Please be as descriptive as possible." }
      ],

      indicators: [
        {
          id: "user_characteristics",
          label: "User characteristics",
          title: "User characteristics",
          show: null, // TODO: add an example measurement and description
          questions: []
        },
        {
          id: "use_case",
          label: "Use case (work, education, personal use)",
          title: "Use case classification (work / non-work)",
          show: {
            summary: "This indicator measures the share of messages across AI platforms used for work, personal purposes, or education.",
            lead: "The use case indicator would allow for measurements such as:",
            chart: {
              title: "Share of messages by use case, Country A",
              unit: "%",
              bars: [ { label: "Work", value: 46 }, { label: "Personal use", value: 38 }, { label: "Education", value: 16 } ]
            },
            heading: "Definition of work",
            text: [ "Work is defined as ‘work done for pay or profit, including self-employment and unpaid work in a family business’." ]
          },
          questions: [
            { id: "work_definition", type: "textarea", label: "Does this definition of work cover all forms of work in LMICs?" },
            { id: "edu_personal_categories", type: "textarea", label: "Do you have suggestions on activity categorizations for education and personal use that translate to LMICs?" }
          ]
        },
        {
          id: "work_activities",
          label: "Work activities",
          title: "Work activities",
          show: {
            // The counts, donuts, rankings and search come from these files,
            // built from the O*NET database with tools/build_onet_data.py.
            explorer: { data: "data/onet_activities.json", tasks: "data/soc_tasks.json" },
            summary: "This indicator measures the types of work activities for which people use AI, using the O*NET work activity classification maintained by the U.S. Department of Labor."
          },
          questions: [
            { id: "onet_level", type: "scale", label: "Which level is most useful to you?", options: ["GWA", "IWA", "DWA", "Not sure"] },
            { id: "onet_level_why", type: "textarea", label: "Why is that level the most useful?", showIf: { question: "onet_level", answered: true } },
            { id: "activity_vs_task", type: "textarea", label: "Would your research benefit from activity-based AI exposure indicators, compared to task-based AI exposure indicators from O*NET?" },
            { id: "onet_lmic", type: "textarea", label: "Can you study AI exposure in LMICs using activities from O*NET?" }
          ]
        },
        {
          id: "skills",
          label: "Skills",
          title: "Skills",
          show: {
            summary: "Do you need to know the skills that the AI uses, or the skills the person is asking the AI to use?",
            lead: "There are several ways to group skills:",
            pillGroups: [
              {
                title: "O*NET skills taxonomy",
                note: "A taxonomy of 35 skills, grouped into these high-level categories.",
                sets: [
                  { label: "Basic skills", pills: ["Content skills", "Process skills"] },
                  { label: "Cross-functional skills", pills: ["Social skills", "Complex problem solving skills", "Technical skills", "Systems skills", "Resource management skills"] }
                ]
              },
              {
                title: "LinkedIn skills categories",
                note: "A high-level categorization of skills. It is not a taxonomy.",
                sets: [{ pills: ["Tech skills", "Disruptive tech skills", "Green skills", "Soft skills", "Business skills"] }]
              },
              {
                title: "ILO core skills",
                note: "The skill groups in the ILO Global Framework on Core Skills. The ILO also maintains ISCO.",
                sets: [{ pills: ["Social and emotional skills", "Cognitive and metacognitive skills", "Basic digital skills", "Basic skills for green jobs"] }]
              }
            ]
          },
          questionsBefore: [
            { id: "need_if_activities", type: "scale", label: "Do you require skills mapping if an activity mapping already exists?", options: ["Yes", "No", "Not sure"] }
          ],
          questions: [
            { id: "skills_focus", type: "single", label: "Do you need to know the skills that the AI uses, or the skills the person is asking the AI to use?",
              options: ["Skills the AI uses", "Skills the person is asking the AI to use", "Both", "Not sure"] },
            { id: "skills_framework", type: "single", label: "Which way of grouping skills is better for your work?",
              options: ["O*NET skills taxonomy", "LinkedIn skills categories", "ILO core skills", "None of these"], allowOther: true, otherLabel: "Another framework (please name it)" },
            { id: "skills_framework_why", type: "textarea", label: "Why is that one better for your work?", showIf: { question: "skills_framework", answered: true } }
          ]
        },
        {
          id: "occupational_content",
          label: "Occupational content",
          title: "Occupational field taxonomy and classification",
          show: {
            summary: "This indicator measures which types of occupation involve the requests asked and the outputs created within a chat.",
            text: [ "Every chat will be mapped to a 16-item list of occupational fields, derived by aggregating the ISCO occupation list. This lets users identify which occupational field a chat most closely resembles." ]
          },
          questions: [
            { id: "name_understood", type: "textarea", label: "Is ‘occupational field’ an indicator name you understand to mean ‘topics related to this occupation’?" },
            { id: "isco_lmic", type: "textarea", label: "Is this 16-item list aggregated from ISCO occupations helpful in LMIC research?" },
            { id: "national_taxonomies", type: "textarea", label: "Are you working with countries that are developing their own occupational taxonomies? Can they be mapped to ISCO, and then to this framework?" }
          ]
        },
        {
          id: "education_level",
          label: "Level of education",
          title: "Level of education",
          show: {
            summary: "This indicator measures the level of education needed for the requests and outputs in a chat, using the four ISCO-08 skill levels.",
            lead: "The level of education indicator would allow for measurements such as:",
            chart: {
              title: "Share of messages by ISCO skill level, Country A",
              unit: "%",
              bars: [
                { label: "Level 1: Primary", value: 14 },
                { label: "Level 2: Secondary", value: 41 },
                { label: "Level 3: Short-cycle tertiary", value: 27 },
                { label: "Level 4: Bachelor's or higher", value: 18 }
              ]
            },
            heading: "ISCO-08 skill levels",
            text: [
              "Level 1: primary education. Simple and routine physical or manual tasks.",
              "Level 2: lower or upper secondary education, and some post-secondary non-tertiary courses.",
              "Level 3: short-cycle tertiary education, typically one to three years after secondary school.",
              "Level 4: a bachelor's degree or higher."
            ]
          },
          questions: []
        },
        {
          id: "industry",
          label: "Industry classification",
          title: "Industry classification",
          show: {
            summary: "Which industry do the contents of this chat best relate to? The outputs will be mapped to ISIC Rev. 4 sectors.",
            pillGroups: [{
              title: "ISIC Rev. 4 sections",
              note: "The 21 top-level sections of the International Standard Industrial Classification.",
              sets: [{
                pills: [
                  { code: "A", label: "Agriculture, forestry and fishing" }, { code: "B", label: "Mining and quarrying" },
                  { code: "C", label: "Manufacturing" }, { code: "D", label: "Electricity, gas, steam and air conditioning supply" },
                  { code: "E", label: "Water supply; sewerage, waste management and remediation activities" }, { code: "F", label: "Construction" },
                  { code: "G", label: "Wholesale and retail trade; repair of motor vehicles and motorcycles" }, { code: "H", label: "Transportation and storage" },
                  { code: "I", label: "Accommodation and food service activities" }, { code: "J", label: "Information and communication" },
                  { code: "K", label: "Financial and insurance activities" }, { code: "L", label: "Real estate activities" },
                  { code: "M", label: "Professional, scientific and technical activities" }, { code: "N", label: "Administrative and support service activities" },
                  { code: "O", label: "Public administration and defence; compulsory social security" }, { code: "P", label: "Education" },
                  { code: "Q", label: "Human health and social work activities" }, { code: "R", label: "Arts, entertainment and recreation" },
                  { code: "S", label: "Other service activities" },
                  { code: "T", label: "Activities of households as employers; undifferentiated goods- and services-producing activities of households for own use" },
                  { code: "U", label: "Activities of extraterritorial organizations and bodies" }
                ]
              }]
            }]
          },
          questions: []
        },
        {
          id: "automation",
          label: "Automation vs augmentation",
          title: "Automation / augmentation",
          show: { text: [ "This indicator measures whether the task given to generative AI automates a person’s work or augments it." ] },
          questions: [
            { id: "own_definition", type: "textarea", label: "How would you define this indicator if you could choose the categories behind it?" }
          ]
        }
      ]
    }
  ],

  /* ---------- INDICATOR COMBINATIONS TAB ---------- */
  combinations: {
    title: "Build an indicator combination",
    intro: "Pick up to four indicators, in the order you want to break messages down. The chart shows how messages would flow across them.",
    max: 4,
    maxPriorities: 5,

    // Categories used in the Sankey chart (kept short so the chart stays readable).
    // `phrase` builds the example sentence: {x} is the category name.
    indicators: [
      { id: "user_characteristics", label: "User characteristics", disabled: true,
        disabledNote: "Available once the user characteristics categories are defined." },
      { id: "use_case", label: "Use case", cats: ["Work", "Personal use", "Education"], weights: [46, 38, 16],
        phrase: "are {x}", lower: true },
      { id: "work_activities", label: "Work activities",
        cats: ["Information Input", "Mental Processes", "Work Output", "Interacting with Others"], weights: [16, 34, 22, 28],
        phrase: "involve {x} activities", lower: true, note: "Work activities shows the four O*NET GWA categories." },
      { id: "skills", label: "Skills",
        cats: ["Tech skills", "Disruptive tech skills", "Soft skills", "Business skills", "Green skills"], weights: [30, 12, 26, 24, 8],
        phrase: "use {x}", lower: true, note: "Skills shows the LinkedIn skills categories." },
      { id: "occupational_content", label: "Occupational content",
        cats: ["Professionals", "Technicians and associate professionals", "Managers", "Clerical support workers", "Other occupations"], weights: [34, 18, 14, 12, 22],
        phrase: "relate to work done by {x}", lower: true, note: "Occupational content shows ISCO-08 major groups as a stand-in for the 16 occupational fields." },
      { id: "education_level", label: "Level of education", cats: ["Level 4", "Level 3", "Level 2", "Level 1"], weights: [18, 27, 41, 14],
        phrase: "need ISCO {x}" },
      { id: "industry", label: "Industry classification", short: "Industry",
        cats: ["Education (P)", "Information and communication (J)", "Health (Q)", "Finance (K)", "Other industries"], weights: [20, 19, 15, 11, 35],
        phrase: "relate to the {x} industry", lower: true, stripCode: true, note: "Industry shows the top four ISIC sections plus all others." },
      { id: "automation", label: "Automation vs augmentation", cats: ["Augmentation", "Automation"], weights: [54, 46],
        phrase: "{x} the person’s work", words: { Augmentation: "augment", Automation: "automate" } }
    ],

    builderQuestions: [
      { id: "useful", type: "scale", label: "Is this combination useful to you?", options: ["Yes", "Somewhat", "No", "Not sure"] },
      { id: "use_for", type: "textarea", label: "Why is this combination a priority for your work?" }
    ],

    // A featured combination with its own chart and questions, shown below the builder.
    featured: {
      id: "combo_uc_wa",
      title: "Use case and work activities",
      pills: ["Use case", "Work activities"],
      summary: "This indicator combination measures work activities among messages labeled as work, personal use, or education.",
      chart: {
        title: "Share of messages by IWA within each use case, Country A",
        note: "IWA titles are real O*NET examples.",
        rows: [
          "Read documents or materials to inform work processes.",
          "Study details of artistic productions.",
          "Design industrial systems or equipment.",
          "Perform recruiting or hiring activities."
        ],
        panels: [
          { name: "Work", values: [24, 6, 11, 9] },
          { name: "Personal use", values: [12, 19, 3, 2] },
          { name: "Education", values: [27, 8, 5, 1] }
        ]
      },
      questions: [
        { id: "useful", type: "scale", label: "Is it useful to you to get messages broken down by use case and work activity?", options: ["Yes", "Somewhat", "No", "Not sure"] },
        { id: "onet_sense", type: "scale", label: "Does it make sense to you to use the O*NET work activity classification for personal use and education, especially in low- and middle-income countries?", options: ["Yes", "No", "Not sure"] },
        { id: "alt_education", type: "textarea", label: "If not, do you have an alternative suggestion for classifying chats that belong to the education use case?", showIf: { question: "onet_sense", equals: "No" } },
        { id: "alt_personal", type: "textarea", label: "If not, do you have an alternative suggestion for classifying chats that belong to the personal use use case?", showIf: { question: "onet_sense", equals: "No" } }
      ]
    }
  }
};