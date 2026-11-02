/*
  SURVEY CONTENT
  ==============
  Edit this file to change the survey text and questions. You never need to touch
  index.html, style.css, charts.js or survey.js.

  endpointUrl  – where responses are sent (e.g. your Cloudflare Worker URL).
                 While it is left as the placeholder, the page runs in TEST MODE:
                 nothing is sent, and the data that *would* be sent is shown on screen.

  The page opens with a short scrolling introduction (in index.html), then two tabs:
    Individual indicators   – `pages[0]`: a row of indicator buttons; each opens a split screen
                              (LEFT = what the data would look like, RIGHT = questions).
    Combined indicators     – `combinations`: pick up to four indicators to see a Sankey chart,
                              then rank the combinations you need; plus a featured combination.

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
        { id: "relevant", type: "scale", label: "Is this indicator relevant for policy, development investment, or research decisions?", options: ["Yes", "Somewhat", "No", "Not sure"] },
        { id: "how", type: "textarea", label: "How is it relevant, and how would you use it?", hint: "Please provide a brief explanation or example." }
      ],

      indicators: [
        {
          id: "user_characteristics",
          label: "User Characteristics",
          title: "User Characteristics",
          show: {
            definition: "Characteristics of people who use Consumer Chat Generative AI in countries. These may or may not be the characteristics of the users whose chats are analyzed in the subsequent indicators.",
            taxonomy: "A starter list of characteristics that we may want to measure:",
            pillGroups: [
              { sets: [{ pills: ["Age", "Level of education", "Urban or rural", "Gender", "User occupation", "Income", "Seniority and experience"] }] }
            ],
            example: { note: "An example will be added once the survey questions are agreed." }
          },
          skipCommon: ["relevant"],
          questions: [
            { id: "top_priority", type: "multiple", max: 3, label: "Which of these is highest priority for you? (Choose up to 3)",
              options: ["Age", "Level of education", "Urban or rural", "Gender", "User occupation", "Income", "Seniority and experience"] }
          ]
        },
        {
          id: "use_case",
          label: "Use Case",
          title: "Use Case",
          show: {
            definition: "Whether a chat was used in the context of work, education or personal use.",
            definitionList: [
              { term: "Work", text: "Paid employment, self-employment, or running a business; work done for an employer, a client, or for income; training the employer requires." },
              { term: "Education", text: "Coursework, studying, exams, or training in a program the user is enrolled in." },
              { term: "Personal use", text: "Household, family, health, finances, hobbies, and leisure; the user’s own job search; and self-directed learning." }
            ],
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
            { id: "work_definition", type: "textarea", label: "Does this definition of work cover all forms of work in LMICs?" },
            { id: "edu_personal_categories", type: "textarea", label: "Do you have suggestions on activity categorizations for education and personal use that translate to LMICs?" }
          ]
        },
        {
          id: "work_activities",
          label: "Work Activity",
          title: "Work Activity",
          show: {
            definition: "The main work activity that the conversation is used for.",
            taxonomy: "The O*NET Work Activity taxonomies:",
            taxonomyBullets: [
              { term: "Option 1:", text: "Classify all chats to O*NET Work Activities by 1 of 4 O*NET levels. Within Option 1, we can classify chats by:",
                sub: [
                  { term: "General Work Activities (GWAs).", text: "Highest level, with 41 items." },
                  { term: "Intermediate Work Activities (IWAs).", text: "332 items, which map to the GWAs." },
                  { term: "Detailed Work Activities (DWAs)." },
                  { term: "Tasks.", text: "19,000+ items created from US occupations and a survey of US workers." }
                ] },
              { term: "Option 2:", text: "Classify Work-related chats to O*NET Work Activities, Personal Use chats to Time Use Surveys, and Education chats also to Work Activities." }
            ],
            // The donuts, rankings and search come from data files built with tools/build_onet_data.py.
            example: { explorer: { data: "data/onet_activities.json", tasks: "data/soc_tasks.json" } }
          },
          skipCommon: ["how"],
          questions: [
            { id: "taxonomy_option", type: "single", label: "Which taxonomy option do you think is more suited?",
              options: ["Option 1", "Option 2", "Not sure"] },
            { id: "activity_vs_task", type: "single", label: "Which of the 4 levels would be most useful to study the activities AI is used for?",
              options: ["General Work Activities (GWAs)", "Intermediate Work Activities (IWAs)", "Detailed Work Activities (DWAs)", "Tasks", "Not sure"],
              showIf: { question: "taxonomy_option", equals: "Option 1" } },
            { id: "time_use_survey", type: "textarea", label: "Which Time Use Survey is best suited to measure global chat data?",
              showIf: { question: "taxonomy_option", equals: "Option 2" } },
            { id: "education_onet", type: "scale", label: "Can education-related chats be measured using O*NET work activities?", options: ["Yes", "No", "Not sure"],
              showIf: { question: "taxonomy_option", equals: "Option 2" } },
            { id: "work_level", type: "single", label: "Which O*NET level is best suited to classify work-related chats?",
              options: ["General Work Activities (GWAs)", "Intermediate Work Activities (IWAs)", "Detailed Work Activities (DWAs)", "Tasks", "Not sure"],
              showIf: { question: "taxonomy_option", equals: "Option 2" } },
            { id: "how", type: "textarea", label: "How is it relevant, and how would you use it?", hint: "Please provide a brief explanation or example." },
            { id: "onet_lmic", type: "textarea", label: "Can you study AI exposure in LMICs using activities from O*NET?" }
          ]
        },
        {
          id: "skills",
          label: "Skills",
          title: "Skills",
          show: {
            definition: "Skill used by AI to create the output in this chat. This can be a one to many mapping between a chat and skills.",
            pillGroups: [
              { title: "Option 1: ILO core skills", note: "The skill groups in the ILO Global Framework on Core Skills.",
                sets: [{ pills: ["Cognitive and metacognitive skills", "Basic digital skills", "Social and emotional skills", "Basic skills for green jobs"] }] },
              { title: "Option 2: O*NET skills taxonomy", note: "A taxonomy of 35 skills, grouped into these high-level categories.",
                sets: [ { label: "Basic skills", pills: ["Content skills", "Process skills"] },
                        { label: "Cross-functional skills", pills: ["Social skills", "Complex problem solving skills", "Technical skills", "Systems skills", "Resource management skills"] } ] },
              { title: "Option 3: LinkedIn skills categories", note: "A high-level categorization of skills. It is not a taxonomy.",
                sets: [{ pills: ["Tech skills", "Soft skills", "Business skills", "Disruptive tech skills", "Green skills"] }] }
            ],
            example: { note: "An example will be added once a skills classification is chosen." }
          },
          questions: [
            { id: "skills_focus", type: "single", label: "Which is more important: the skills that the generative AI uses, or the skills the person is asking the generative AI to use?",
              options: ["Skills the AI uses", "Skills the person is asking the AI to use", "Both equally", "Not sure"] },
            { id: "need_if_activities", type: "scale", label: "Do you require skills mapping if an activity mapping already exists?", options: ["Yes", "No", "Not sure"] },
            { id: "skills_framework", type: "single", label: "Which option is better suited to classify chats by this indicator?",
              options: ["Option 1: ILO core skills", "Option 2: O*NET skills taxonomy", "Option 3: LinkedIn skills categories", "None of these"], allowOther: true, otherLabel: "Another framework (please name it)" },
            { id: "skills_framework_why", type: "textarea", label: "Why is that one better for your work?", showIf: { question: "skills_framework", answered: true } }
          ]
        },
        {
          id: "occupational_content",
          label: "Occupational Content",
          title: "Occupational Content",
          show: {
            definition: "The occupational field a conversation or message relates to. This is not the user’s occupation: a lawyer and a person looking for legal advice would both be classified under ‘Legal’.",
            definitionHighlight: "This is not the user’s occupation:",
            taxonomy: "16 categories created by aggregating ISCO occupations.",
            taxonomyTable: {
              columns: ["#", "Field", "ISCO-08 groups", "The work, and in brackets the workers who do it"],
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
                title: "Share of messages by occupational field, Country A",
                layout: "stacked",
                unit: "%",
                bars: [
                  { label: "Information and communications technology", value: 21 }, { label: "Business and administration", value: 17 },
                  { label: "Teaching", value: 12 }, { label: "Writing, translation, and the arts", value: 11 }, { label: "Health", value: 8 },
                  { label: "All other fields", value: 31 }
                ]
              }
            }
          },
          questions: [
            { id: "name_understood", type: "textarea", label: "Is ‘occupational field’ an indicator name you understand to mean ‘topics related to this occupation’?" },
            { id: "isco_lmic", type: "textarea", label: "Is this 16-item list aggregated from ISCO occupations helpful in LMIC research?" },
            { id: "national_taxonomies", type: "textarea", label: "Are you working with countries that are developing their own occupational taxonomies? Can they be mapped to ISCO, and then to this framework?" }
          ]
        },
        {
          id: "industry",
          label: "Industry",
          title: "Industry",
          show: {
            definition: "This indicator measures the industry or sector that the chat relates to. It does not measure the occupational content. For example, for a chat, the work activity could be ‘Edit written materials or documents’, the occupational content could be ‘Teaching’ and the industry could be ‘Health’.",
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
          id: "automation",
          label: "Automation vs Augmentation",
          title: "Automation / Augmentation",
          show: {
            definition: "Whether AI completes a task on its own (automation) or supports a person who remains in charge of it (augmentation). For labor-market specialists this is replacement versus augmentation of tasks; in education, learning versus offloading; in digital development, which tasks are handed over to AI.",
            taxonomy: "Automation consists of directive and feedback-loop chats. Augmentation consists of task iteration, learning and validation.",
            example: {
              chart: {
                type: "split",
                title: "Share of messages that automate or augment work, Country A",
                parts: [ { name: "Augmentation", value: 54 }, { name: "Automation", value: 46 } ]
              }
            }
          },
          questions: [
            { id: "taxonomy_feedback", type: "textarea", label: "Is this taxonomy useful? Do you have an alternative way to measure automation vs augmentation?" }
          ]
        },
        {
          id: "time_gains",
          label: "Time Gains",
          title: "Time Gains",
          show: {
            definition: "The time saved by using generative AI for an activity: the time a competent person (not a beginner or an expert) would need without AI, minus the time spent with AI.",
            taxonomy: "Broad, roughly logarithmic bands, which reduce classification errors:",
            taxonomyList: [
              { term: "Less than 5 minutes", text: "A few minutes of work." },
              { term: "5 minutes to 1 hour", text: "Between a few minutes and an hour’s work." },
              { term: "1 to 8 hours", text: "Between an hour and a day’s work." },
              { term: "More than 8 hours", text: "More than a day’s work; can be split further." }
            ],
            example: {
              chart: {
                title: "Share of messages by time saved, Country A",
                unit: "%",
                bars: [ { label: "Less than 5 minutes", value: 41 }, { label: "5 minutes to 1 hour", value: 38 }, { label: "1 to 8 hours", value: 17 }, { label: "More than 8 hours", value: 4 } ]
              }
            }
          },
          questions: []
        },
        {
          id: "expertise",
          label: "Proficiency",
          title: "Proficiency",
          show: {
            definition: "The proficiency, expertise or level of education associated with a message or conversation: the cognitive and technical complexity needed to write the prompt and to understand and use the AI’s output.",
            taxonomy: "Several ways of grouping levels are under discussion:",
            pillGroups: [
              { title: "Option 1: Domain expertise", note: "Low, medium, or high. Classes with sharp boundaries are easier to classify reliably, and avoid comparing years of education across countries.",
                sets: [{ pills: ["Low", "Medium", "High"] }] },
              { title: "Option 2: Education level (ILO, aggregate ISCED-97)", note: "An international standard for education levels. Very helpful for policy advice.",
                sets: [{ pills: ["Less than basic", "Basic", "Intermediate", "Advanced", "Level not stated"] }] }
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
            { id: "best_option", type: "single", label: "Which option is better suited to classify chats by this indicator?",
              options: ["Option 1: Domain expertise", "Option 2: Education level", "None of these", "Not sure"] }
          ]
        },
        {
          id: "language",
          label: "Language of Interaction",
          title: "Language of Interaction",
          show: {
            definition: "The share of messages in each of a country’s main languages, per quarter.",
            taxonomy: "For every country, the languages spoken by at least 10% of the population.",
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
        },
        {
          id: "time_of_use",
          label: "Time of Use",
          title: "Time of Use",
          show: {
            definition: "When consumer chat is used: time of day, day of week and day of month. This is recorded, not inferred.",
            taxonomyBullets: [
              { term: "Option 1:", text: "Hourly bands + weekday/weekend." },
              { term: "Option 2:", text: "4-hourly bands combined with a weekday/weekend tag." }
            ],
            example: {
              chart: {
                title: "Share of weekday messages by time of day, Country A",
                unit: "%",
                bars: [
                  { label: "00:00–04:00", value: 4 }, { label: "04:00–08:00", value: 7 }, { label: "08:00–12:00", value: 27 },
                  { label: "12:00–16:00", value: 28 }, { label: "16:00–20:00", value: 20 }, { label: "20:00–24:00", value: 14 }
                ]
              }
            }
          },
          questions: [
            { id: "taxonomy_option", type: "single", label: "Which taxonomy option do you prefer?",
              options: ["Option 1: Hourly bands + weekday/weekend", "Option 2: 4-hourly bands with a weekday/weekend tag"], allowOther: true, otherLabel: "Another option (please specify)" }
          ]
        }
      ]
    }
  ],

  /* ---------- COMBINED INDICATORS TAB ---------- */
  combinations: {
    title: "Build an indicator combination",
    intro: "Pick up to four indicators, in the order you want to break messages down. The sentence below shows the share of messages in each selected category.",
    max: 4,
    maxPriorities: 5,
    showExampleData: false,   // true shows a "See example data" table under the summary

    // `phrase` builds the example sentence: {x} is the selected category name.
    indicators: [
      { id: "use_case", label: "Use Case", cats: ["Work", "Personal use", "Education"], weights: [46, 38, 16],
        phrase: "are {x}", lower: true },
      { id: "work_activities", label: "Work Activity",
        cats: ["Information Input", "Mental Processes", "Work Output", "Interacting with Others"], weights: [16, 34, 22, 28],
        phrase: "involve {x} activities", lower: true, note: "Work activities shows the four O*NET GWA categories." },
      { id: "skills", label: "Skills",
        cats: ["Tech skills", "Disruptive tech skills", "Soft skills", "Business skills", "Green skills"], weights: [30, 12, 26, 24, 8],
        phrase: "use {x}", lower: true, note: "Skills shows the LinkedIn skills categories." },
      { id: "occupational_content", label: "Occupational Content",
        cats: ["Teaching", "Business and administration", "Health", "Information and communications technology", "Other fields"], weights: [30, 15, 12, 10, 33],
        phrase: "relate to {x} work", lower: true, note: "Occupational content shows the four largest of the 16 fields plus all others." },
      { id: "industry", label: "Industry",
        cats: ["Human health and social work", "Education", "Financial and insurance activities", "Information and communication", "Other industries"], weights: [30, 14, 10, 9, 37],
        phrase: "relate to {x}", lower: true, note: "Industry shows the four largest industry groups plus all others." },
      { id: "automation", label: "Automation vs Augmentation", cats: ["Augmentation", "Automation"], weights: [54, 46],
        phrase: "{x} work", words: { Augmentation: "augment", Automation: "automate" } },
      { id: "time_gains", label: "Time Gains", cats: ["Less than 5 minutes", "5 minutes to 1 hour", "1 to 8 hours", "More than 8 hours"], weights: [41, 38, 17, 4],
        phrase: "save {x}", words: { "Less than 5 minutes": "less than 5 minutes", "5 minutes to 1 hour": "between 5 minutes and an hour", "1 to 8 hours": "between 1 and 8 hours", "More than 8 hours": "more than 8 hours" } },
      { id: "expertise", label: "Proficiency", cats: ["High", "Medium", "Low"], weights: [19, 44, 37],
        phrase: "need {x} domain expertise", lower: true, note: "Proficiency uses the low / medium / high domain expertise option." },
      { id: "language", label: "Language of Interaction", short: "Language", cats: ["Main national language", "Second national language", "Other languages"], weights: [61, 33, 6],
        phrase: "are in the {x}", lower: true, note: "Language shows a country's two main languages plus all others." },
      { id: "time_of_use", label: "Time of Use", cats: ["Weekday working hours", "Weekday evenings", "Weekends", "Late night"], weights: [44, 24, 22, 10],
        phrase: "are sent {x}", words: { "Weekday working hours": "during weekday working hours", "Weekday evenings": "on weekday evenings", "Weekends": "at weekends", "Late night": "late at night" },
        note: "Time of use categories are placeholders." }
    ],

    builderQuestions: [
      { id: "use_for", type: "textarea", label: "Why is this combination a priority for your work?" }
    ],

    // A featured combination with its own chart and questions, shown below the builder.
    featured: {
      id: "combo_uc_wa",
      hidden: true,             // remove this line to show the section again
      heading: "Filter Work Chats",
      showChart: true,          // false hides the chart
      summary: [
        "After classifying chats by Use Case (Work/Non-work), we can:"
      ],
      bullets: [
        { term: "Option 1:", text: "Classify ALL the chats by Work Activities separately." },
        { term: "Option 2:", text: "Classify Work chats by Work Activities, Personal Use chats by Time Use Surveys and Education chats by a different taxonomy." }
      ],
      summaryAfter: [
        "This means Personal Use & Educational Use will be measured by Work Activity taxonomies."
      ],
      chart: {
        type: "treemap",
        title: "Example: Personal use messages by General Work Activity, Country A",
        note: "Only GWAs from the Interacting with Others and Work Output categories are shown.",
        groups: [
          { name: "Interacting with Others", items: [
            { name: "Providing Consultation and Advice to Others", value: 14.2 },
            { name: "Interpreting the Meaning of Information for Others", value: 11.6 },
            { name: "Establishing and Maintaining Interpersonal Relationships", value: 9.1 },
            { name: "Assisting and Caring for Others", value: 7.4 },
            { name: "Training and Teaching Others", value: 6.3 },
            { name: "Communicating with People Outside the Organization", value: 4.2 },
            { name: "Resolving Conflicts and Negotiating with Others", value: 3.1 },
            { name: "Selling or Influencing Others", value: 2.4 },
            { name: "Coaching and Developing Others", value: 2.0 },
            { name: "Communicating with Supervisors, Peers, or Subordinates", value: 1.6 },
            { name: "Performing Administrative Activities", value: 1.4 },
            { name: "Performing for or Working Directly with the Public", value: 0.9 },
            { name: "Monitoring and Controlling Resources", value: 0.8 },
            { name: "Coordinating the Work and Activities of Others", value: 0.6 },
            { name: "Developing and Building Teams", value: 0.3 },
            { name: "Guiding, Directing, and Motivating Subordinates", value: 0.3 },
            { name: "Staffing Organizational Units", value: 0.2 } ] },
          { name: "Work Output", items: [
            { name: "Working with Computers", value: 13.8 },
            { name: "Documenting/Recording Information", value: 9.6 },
            { name: "Performing General Physical Activities", value: 3.1 },
            { name: "Handling and Moving Objects", value: 2.0 },
            { name: "Operating Vehicles, Mechanized Devices, or Equipment", value: 1.6 },
            { name: "Repairing and Maintaining Mechanical Equipment", value: 1.4 },
            { name: "Repairing and Maintaining Electronic Equipment", value: 1.1 },
            { name: "Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment", value: 0.6 },
            { name: "Controlling Machines and Processes", value: 0.4 } ] }
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