/*
  SURVEY CONTENT
  ==============
  Edit this file to change the survey text and questions. You never need to touch
  index.html, style.css, charts.js or survey.js.

  endpointUrl  – where responses are sent (the ASP.NET backend uses /api/responses).
                 While it is left as the placeholder, the page runs in TEST MODE:
                 nothing is sent, and the data that *would* be sent is shown on screen.

  The page opens with a short scrolling introduction (in index.html),   then two tabs:
    Individual indicators   – `pages[0]`: a row of indicator buttons; each opens a split screen
                              (LEFT = what the data would look like, RIGHT = questions).
    Combined indicators     – `combinations`: pick up to `max` (3) indicators, with `exclusiveGroups` that can't be combined, to see the summary,
                              then rank the combinations you need.

  THE LEFT SIDE OF AN INDICATOR (`show`) – every part is optional, shown in this order:
    what:     "What the indicator measures"            (shown as  What: …)
    how:      "The taxonomy or method used"            (shown as  How: …)
    howList:  [ { term, text } ]                       definitions shown under How
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

  IDS AND CODES: every indicator has a short `code` (e.g. ACT) and every question a `code` (e.g. Q1).
  Answers are sent under <indicator code>_<question code>, e.g. ACT_Q1; "Other" text adds _OTH.
  The backend relies on these codes (see README.md): never reuse or change a code once responses arrive.
  Internal `id`s are used for links and saved drafts only.
  LINK TO ONE INDICATOR: add #<indicator id> to the address, e.g. .../#work_activities
  LINK TO THE COMBINATIONS TAB: .../#combinations
*/

window.SURVEY_CONFIG = {
  siteTitle: "AI Index stakeholder consultation",
  surveyVersion: "2026-11-6",   // sent with every response; bump when questions change

  endpointUrl: "/api/responses",

  submitLabel: "Submit feedback",
  thankYouTitle: "Thank you for your feedback",
  thankYouMessage: "Your answers have been recorded. You can close this page.",
  country: "Country A",
  illustrativeNote: "Illustrative figures for an example country. Not real data.",

  // Shown once at the top of the survey, before the indicator tabs. Answers are sent as RSP_<code>.
  aboutQuestions: [
    { id: "sector", code: "Q1", type: "text", label: "Which sector do you work in?" }
  ],

  pages: [
    {
      id: "adoption",
      type: "indicators",
      title: "Indicators relevant to studying characteristics of AI adoption",
      intro:
        "Choose an indicator to see the kind of measurement it would allow, then tell us whether it is useful for policy research. " +
        "Answer as many indicators as are relevant to your work.",

      commonQuestions: [
        { id: "relevant", code: "REL", type: "scale", label: "Is this indicator relevant for policy, development investment, or research?", options: ["Yes", "Somewhat", "No", "Not sure"] },
        { id: "how", code: "HOW", type: "textarea", label: "Is this useful to you? How would you use it? Which datasets would you combine this with?", hint: "Please provide specific examples of how this would be useful in your work." }
      ],

      indicators: [
        {
          id: "use_case",
          code: "USE",
          label: "Use Case",
          title: "Use Case",
          show: {
            definition: "Whether a chat was used in the context of work, education or personal use.",
            definitionTable: {
              columns: ["Use case", "Definition"],
              rowHeader: 0,
              rows: [
                ["Work", "Paid employment, self-employment, or running a business; work done for an employer, a client, family business or for income; training the employer requires."],
                ["Education", "Coursework, studying, exams, or training in a program the user is enrolled in."],
                ["Personal use", "Household, family, health, finances, hobbies, and leisure; the user’s own job search; and self-directed learning."]
              ]
            },
            taxonomy: "Work, personal use, education.",
            example: {
              chart: {
                type: "split",
                title: "Share of consumer chat AI messages by use case, Argentina, 2027 Q1",
                noteOverride: "Illustrative figures. Not real data for Argentina.",
                parts: [ { name: "Work", value: 38 }, { name: "Personal use", value: 48 }, { name: "Education", value: 14 } ]
              }
            }
          },
          questions: [
            { id: "work_definition", code: "Q1", type: "textarea", label: "Does this definition of work cover all forms of work in low- and middle-income countries?" },
            { id: "edu_personal_categories", code: "Q2", type: "textarea", label: "Do you have suggestions on activity categorizations for education and personal use that translate to low- and middle-income countries?" }
          ]
        },
        {
          id: "work_activities",
          code: "ACT",
          label: "Work Activities",
          title: "Work Activities",
          show: {
            definition: "The main work activity that the conversation is used for.",
            taxonomy: "All chats are classified to O*NET Work Activities, at 1 of 2 O*NET levels:",
            taxonomyBullets: [
              { term: "General Work Activities (GWAs).", text: "Highest level, with 41 items." },
              { term: "Intermediate Work Activities (IWAs).", text: "332 items, which map to the GWAs." }
            ],
            // The donuts, rankings and search come from data files built with tools/build_onet_data.py.
            example: { explorer: { data: "data/onet_activities.json", levels: ["gwa", "iwa"] } }
          },
          skipCommon: ["how"],
          questions: [
            { id: "how", code: "HOW", type: "textarea", label: "Is this useful to you? How would you use it? Which datasets would you combine this with?", hint: "Please provide specific examples of how this would be useful in your work." },
            { id: "onet_lmic", code: "Q6", type: "textarea", label: "Can you study AI exposure in low- and middle-income countries using activities from O*NET?" }
          ]
        },
        {
          id: "occupational_content",
          code: "OCC",
          label: "Occupational Topic",
          title: "Occupational Topic",
          show: {
            definition: "The occupational topic a conversation or message relates to. This is not the user’s occupation: a lawyer and a person looking for legal advice would both be classified under ‘Legal’.",
            definitionHighlight: "This is not the user’s occupation:",
            taxonomy: "16 categories created by aggregating ISCO occupations.",
            taxonomyTable: {
              columns: ["#", "Topic", "ISCO-08 groups", "The work, and in brackets the workers who do it"],
              rows: [
                ["1", "Management", "1", "Planning, directing, and coordinating an organization or a team; budgets; hiring (chief executives; department and project managers; owner-managers)"],
                ["2", "Science and engineering", "21; 31", "Research, design, and calculation in the sciences, mathematics and statistics, engineering, and architecture; product and graphic design (scientists, statisticians, engineers, architects, designers; technicians)"],
                ["3", "Health", "22; 32", "Diagnosing, treating, and caring for people and animals; medicines, diet, rehabilitation (doctors, nurses, veterinarians, dentists, pharmacists; medical technicians, nursing associates)"],
                ["4", "Teaching", "23", "Teaching learners at any level; lessons, teaching material, grading, curricula (teachers from early childhood to university; trainers)"],
                ["5", "Business and administration", "24; 33", "Accounting, finance, and tax; consulting and policy analysis; human resources; marketing, public relations, and sales (accountants, financial analysts, consultants, human resources and marketing specialists; brokers, buyers)"],
                ["6", "Information and communications technology", "25; 35", "Software and websites; databases, systems, and networks; user support (developers, programmers, systems and database administrators; ICT technicians)"],
                ["7", "Legal", "261; 3411", "Law, contracts, rights, disputes, legal documents (lawyers, judges, notaries; paralegals)"],
                ["8", "Social science, counselling, and religion", "262–263; 3412–3413; 342", "Economics, history, psychology, politics; counselling and social work; religion; libraries and archives; sports coaching (economists, psychologists, social workers, clergy, librarians; coaches and fitness instructors)"],
                ["9", "Writing, translation, and the arts", "264–265; 343", "Fiction, journalism, and other texts for publication; translation; visual art, music, film, photography (authors, journalists, translators; artists, musicians, photographers)"],
                ["10", "Clerical support", "4", "Records, forms, scheduling, correspondence, data entry, bookkeeping entries (secretaries, office clerks, receptionists, payroll clerks)"],
                ["11", "Service and sales", "5", "Serving customers and selling; cooking; personal care and childcare; protection (cooks, waiters, shop assistants, hairdressers, childcare workers, security staff)"],
                ["12", "Skilled agricultural, forestry, and fishery", "6", "Growing crops, raising animals, forestry, fishing (farmers, gardeners, foresters, fishers)"],
                ["13", "Craft and related trades", "7", "Building, installing, and repairing structures, machines, and equipment (builders, electricians, mechanics, plumbers, carpenters)"],
                ["14", "Plant and machine operations and assembly", "8", "Operating machinery and vehicles; assembly; driving (machine operators, assemblers, drivers)"],
                ["15", "Elementary tasks", "9", "Routine manual work: cleaning, laboring, kitchen help, delivery (cleaners, laborers, kitchen helpers)"],
                ["16", "Armed forces", "0", "Military service (officers and other ranks)"],
                ["R", "No occupational content", "–", "No task, or content that draws on no occupation’s expertise"],
                ["X, D", "Cannot be read; declined", "–", "An empty, garbled, or cut-off message; or a readable message whose content the classifier does not engage with"]
              ]
            },
            example: {
              chart: {
                title: "Share of messages by occupational topic, Country A",
                layout: "stacked",
                unit: "%",
                bars: [
                  { label: "Information and communications technology", value: 21 }, { label: "Business and administration", value: 17 },
                  { label: "Teaching", value: 12 }, { label: "Writing, translation, and the arts", value: 11 }, { label: "Health", value: 8 },
                  { label: "All other topics", value: 31 }
                ]
              }
            }
          },
          questions: [
            { id: "isco_lmic", code: "Q2", type: "textarea", label: "This classification mixes 2 digit and 3 digit ISCO Occupation Levels. Would you be able to use it within your research?" }
          ]
        },
        {
          id: "industry",
          code: "IND",
          label: "Industry",
          title: "Industry",
          show: {
            definition: "This indicator measures the industry or sector that the chat relates to. It does not measure the occupational topic. For example, for a chat, the work activity could be ‘Edit written materials or documents’, the occupational topic could be ‘Teaching’ and the industry could be ‘Health’.",
            taxonomy: "The 21 sections of the International Standard Industrial Classification of All Economic Activities (ISIC Rev. 4).",
            taxonomyTable: {
              columns: ["Section", "Description", "Divisions"],
              rows: [
                ["A", "Agriculture, forestry and fishing", "01–03"],
                ["B", "Mining and quarrying", "05–09"],
                ["C", "Manufacturing", "10–33"],
                ["D", "Electricity, gas, steam and air conditioning supply", "35"],
                ["E", "Water supply; sewerage, waste management and remediation activities", "36–39"],
                ["F", "Construction", "41–43"],
                ["G", "Wholesale and retail trade; repair of motor vehicles and motorcycles", "45–47"],
                ["H", "Transportation and storage", "49–53"],
                ["I", "Accommodation and food service activities", "55–56"],
                ["J", "Information and communication", "58–63"],
                ["K", "Financial and insurance activities", "64–66"],
                ["L", "Real estate activities", "68"],
                ["M", "Professional, scientific and technical activities", "69–75"],
                ["N", "Administrative and support service activities", "77–82"],
                ["O", "Public administration and defence; compulsory social security", "84"],
                ["P", "Education", "85"],
                ["Q", "Human health and social work activities", "86–88"],
                ["R", "Arts, entertainment and recreation", "90–93"],
                ["S", "Other service activities", "94–96"],
                ["T", "Activities of households as employers; undifferentiated goods- and services-producing activities of households for own use", "97–98"],
                ["U", "Activities of extraterritorial organizations and bodies", "99"]
              ]
            },
            example: {
              chart: {
                title: "Share of messages by industry group, Country A",
                layout: "stacked",
                unit: "%",
                bars: [
                  { label: "Information and communication", value: 21 }, { label: "Education", value: 17 },
                  { label: "Real estate, professional, scientific, technical and administrative", value: 14 },
                  { label: "Human health and social work", value: 10 }, { label: "Trade, transport, accommodation and food", value: 8 },
                  { label: "All other groups", value: 30 }
                ]
              }
            }
          },
          questions: []
        },
        {
          id: "expertise",
          code: "PRF",
          label: "Proficiency",
          title: "Proficiency",
          show: {
            definition: "The proficiency, expertise or level of education associated with a message or conversation: the cognitive and technical complexity needed to write the prompt and to understand and use the AI’s output.",
            taxonomy: "Several ways of grouping levels are under discussion:",
            pillGroups: [
              { title: "Option 1: Domain expertise", note: "Low, medium, or high. Classes with sharp boundaries are easier to classify reliably, and avoid comparing years of education across countries.",
                sets: [{ pills: ["Low", "Medium", "High"] }] },
              { title: "Option 2: Education level (ILO, aggregate ISCED-97)", note: "An international standard for education levels. Very helpful for policy advice.",
                table: {
                  columns: ["ILO aggregate level", "Corresponding ISCED-97 levels", "Definition & scope"],
                  rowHeader: 0,
                  rows: [
                    ["Less than basic", "X. No schooling\n0. Pre-primary education", "Includes individuals with no formal education at all or those who only completed early childhood programs (typically starting at age 3) before primary school."],
                    ["Basic", "1. Primary education (first stage of basic education)\n2. Lower secondary (second stage of basic education)", "Covers foundational learning in reading, writing, and mathematics, extending through subject-oriented middle or junior high school levels."],
                    ["Intermediate", "3. Upper secondary education\n4. Post-secondary non-tertiary education", "Encompasses specialized high school diplomas and practical or vocational training programs that prepare students for direct labor market entry or university."],
                    ["Advanced", "5. First stage of tertiary education\n6. Second stage of tertiary education", "Includes all higher education, ranging from practical technical degrees and bachelor’s or master’s degrees (Level 5) to doctoral programs requiring an advanced research thesis (Level 6)."],
                    ["Level not stated", "?. Level not stated", "Used in survey and census data when an individual’s highest completed level of education is unknown, unclassifiable, or was not reported."]
                  ]
                } }
            ],
            example: {
              chart: {
                title: "Share of messages by domain expertise needed, Country A",
                unit: "%",
                bars: [ { label: "Low", value: 37 }, { label: "Medium", value: 44 }, { label: "High", value: 19 } ]
              }
            }
          },
          questions: [
            { id: "best_option", code: "Q1", type: "single", label: "Which option is better suited to classify chats by this indicator?",
              options: ["Option 1: Domain expertise", "Option 2: Education level", "None of these", "Not sure"] }
          ]
        },
        {
          id: "language",
          code: "LNG",
          label: "Language of Interaction",
          title: "Language of Interaction",
          show: {
            definition: "The share of messages in each of a country’s main languages, per quarter.",
            taxonomy: "For every country, the languages spoken by at least 7% of the population.",
            example: {
              chart: {
                type: "split",
                title: "Share of messages by language, Kenya, 2027 Q1",
                noteOverride: "Illustrative figures. Not real data for Kenya.",
                parts: [ { name: "English", value: 61 }, { name: "Kiswahili", value: 33 }, { name: "Other languages", value: 6 } ]
              }
            }
          },
          questions: []
        }
      ]
    }
  ],

  /* ---------- COMBINED INDICATORS TAB ---------- */
  combinations: {
    title: "Build an indicator combination",
    intro: "Combining multiple indicators is limited by size of the sample. Pills will be grayed out if a specific indicator combination is not possible owing to sample size",
    max: 3,                   // most indicators allowed in one combination
    // Within each group, picking one indicator disables the others.
    exclusiveGroups: [["work_activities", "occupational_content", "industry"]],
    maxPriorities: 5,
    showExampleData: false,   // true shows a "See example data" table under the summary

    // `phrase` builds the example sentence: {x} is the selected category name.
    indicators: [
      { id: "use_case", label: "Use Case", cats: ["Work", "Personal use", "Education"], weights: [46, 38, 16],
        phrase: "are {x}", lower: true, words: { Work: "work-related" } },
      { id: "work_activities", label: "Work Activities", catsFrom: "gwa", cats: [], weights: [],
        phrase: "involve the work activity “{x}”", note: "Work activities shows the 41 O*NET General Work Activities (GWAs)." },
      { id: "occupational_content", label: "Occupational Topic",
        cats: ["Teaching", "Business and administration", "Health", "Information and communications technology", "Other topics"], weights: [30, 15, 12, 10, 33],
        phrase: "relate to {x}", lower: true, note: "Occupational topic shows the four largest of the 16 topics plus all others." },
      { id: "industry", label: "Industry",
        cats: ["Agriculture, forestry and fishing", "Industry, including construction", "Trade, transport, accommodation and food", "Information and communication", "Financial and insurance activities",
          "Real estate, professional, scientific, technical and administrative", "Public administration and defense", "Education", "Human health and social work", "Arts, recreation and other services"],
        weights: [8, 14, 16, 12, 8, 14, 6, 10, 8, 4],
        phrase: "relate to {x}", lower: true, note: "Industry shows the 10 aggregated industry groups." },
      { id: "expertise", label: "Proficiency", cats: ["High", "Medium", "Low"], weights: [19, 44, 37],
        phrase: "need {x} domain expertise", lower: true, note: "Proficiency uses the low / medium / high domain expertise option." },
      { id: "language", label: "Language of Interaction", short: "Language", cats: ["Main national language", "Second national language", "Other languages"], weights: [61, 33, 6],
        phrase: "are in the {x}", lower: true, note: "Language shows a country's two main languages plus all others." }
    ],

    builderQuestions: [
      { id: "use_for", code: "WHY", type: "textarea", label: "Why is this combination a priority for your work?" }
    ],

    // Asked once for the whole tab (not per combination). Sent as CMB_<code>.
    questions: [
      { id: "other_datasets", code: "Q1", type: "textarea", label: "What other datasets would you combine these indicators with?" }
    ]
  }
};
