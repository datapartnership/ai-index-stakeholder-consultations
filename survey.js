/*
  Survey engine. Reads window.SURVEY_CONFIG (questions.js) and window.SurveyCharts (charts.js).
  You shouldn't need to edit this file to change questions or text.
*/
(function () {
  "use strict";

  const cfg = window.SURVEY_CONFIG;
  const C = window.SurveyCharts;
  const app = document.getElementById("app");
  const OTHER = "__other__";
  const DRAFT_KEY = "survey-draft:" + location.pathname;

  if (!cfg || !Array.isArray(cfg.pages) || !cfg.pages[0] || !C) {
    app.textContent = "The survey files (questions.js, charts.js) could not be loaded.";
    return;
  }
  const page = cfg.pages[0];
  const combosCfg = cfg.combinations || null;
  const endpoint = cfg.endpointUrl || cfg.flowUrl || "";
  const testMode = !endpoint || /PASTE_YOUR_/.test(endpoint);
  const COUNTRY = cfg.country || "Country A";
  const NOTE = cfg.illustrativeNote || "Illustrative figures for an example country. Not real data.";

  // ---------- Data Partnership hero art ----------
  const HERO_ART = [["d c l4",{right:"-234px",top:"-284px",width:"707px",height:"707px"}],["d c p15 so",{right:"-116px",bottom:"-235.5px",width:"471px",height:"471px"}],["d c l2 so",{left:"50%",top:"-157px",width:"314px",height:"314px"}],["d p l8 so",{right:"91px",top:"-30px",width:"14px",height:"90px"}],["d p l5 so",{right:"91px",top:"80px",width:"14px",height:"50px"}],["d p l5 so",{right:"60px",top:"-10px",width:"14px",height:"60px"}],["d p teal so",{right:"60px",top:"70px",width:"14px",height:"110px"}],["d p l8 so",{right:"29px",top:"-40px",width:"14px",height:"70px"}],["d p l8 so",{right:"29px",top:"50px",width:"14px",height:"40px"}],["d p l5 so",{right:"29px",top:"110px",width:"14px",height:"80px"}],["d p lc l5 so",{left:"18px",bottom:"90px",width:"14px",height:"110px"}],["d p lc l8 so",{left:"18px",bottom:"10px",width:"14px",height:"60px"}],["d p lc orange so",{left:"49px",bottom:"110px",width:"14px",height:"50px"}],["d p lc l5 so",{left:"49px",bottom:"0px",width:"14px",height:"90px"}],["d p l8 so",{right:"122px",top:"-20px",width:"14px",height:"120px"}],["d p teal so",{right:"122px",top:"120px",width:"14px",height:"50px"}],["d p l5 so",{right:"153px",top:"-40px",width:"14px",height:"80px"}],["d p orange so",{right:"153px",top:"60px",width:"14px",height:"40px"}],["d p l8 so",{right:"91px",top:"150px",width:"14px",height:"70px"}],["d p orange so",{right:"60px",top:"200px",width:"14px",height:"40px"}],["d p lc l8 so",{left:"18px",bottom:"223px",width:"14px",height:"60px"}],["d p lc l5 so",{left:"49px",bottom:"185px",width:"14px",height:"50px"}],["t c l4",{right:"-237px",top:"-200px",width:"538px",height:"538px"}],["t c p15 so",{right:"-148px",bottom:"-179.5px",width:"359px",height:"359px"}],["t c l2 so",{left:"50%",top:"-119.5px",width:"239px",height:"239px"}],["t p l8 so",{right:"78px",top:"-16px",width:"12px",height:"48px"}],["t p l5 so",{right:"78px",top:"43px",width:"12px",height:"27px"}],["t p l5 so",{right:"52px",top:"-5px",width:"12px",height:"32px"}],["t p teal so",{right:"52px",top:"37px",width:"12px",height:"59px"}],["t p l8 so",{right:"25px",top:"-21px",width:"12px",height:"37px"}],["t p l8 so",{right:"25px",top:"27px",width:"12px",height:"21px"}],["t p l5 so",{right:"25px",top:"59px",width:"12px",height:"43px"}],["t p l8 so",{right:"105px",top:"-11px",width:"12px",height:"64px"}],["t p teal so",{right:"105px",top:"64px",width:"12px",height:"27px"}],["t p l5 so",{right:"131px",top:"-21px",width:"12px",height:"42px"}],["t p orange so",{right:"131px",top:"32px",width:"12px",height:"21px"}],["t p l8 so",{right:"78px",top:"80px",width:"12px",height:"37px"}],["t p orange so",{right:"52px",top:"106px",width:"12px",height:"21px"}],["m c l4",{right:"-116.5px",top:"-74.5px",width:"273px",height:"273px"}],["m c p15 so",{right:"-71px",bottom:"-91px",width:"182px",height:"182px"}],["m c l2 so",{left:"50%",top:"-60.5px",width:"121px",height:"121px"}],["m p l8 so",{right:"65px",top:"-15px",width:"10px",height:"45px"}],["m p l5 so",{right:"65px",top:"40px",width:"10px",height:"25px"}],["m p l5 so",{right:"43px",top:"-5px",width:"10px",height:"30px"}],["m p teal so",{right:"43px",top:"35px",width:"10px",height:"55px"}],["m p l8 so",{right:"21px",top:"-20px",width:"10px",height:"35px"}],["m p l8 so",{right:"21px",top:"25px",width:"10px",height:"20px"}],["m p l5 so",{right:"21px",top:"55px",width:"10px",height:"40px"}],["m p orange so",{right:"87px",top:"-10px",width:"10px",height:"30px"}],["m p teal so",{right:"87px",top:"30px",width:"10px",height:"25px"}],["m p orange so",{right:"109px",top:"-10px",width:"10px",height:"26px"}],["m p l8 so",{right:"65px",top:"75px",width:"10px",height:"30px"}]];
  (function drawHeroArt() {
    const host = document.getElementById("heroArt");
    if (!host) return;
    HERO_ART.forEach(([cls, style]) => { const i = document.createElement("i"); i.className = cls; Object.assign(i.style, style); host.appendChild(i); });
  })();

  // The 41 O*NET Generalized Work Activities (checked against O*NET OnLine), used when the data file is missing.
  const FALLBACK_GWAS = [
    { name: "Information Input", gwas: ["Getting Information", "Monitoring Processes, Materials, or Surroundings", "Identifying Objects, Actions, and Events", "Inspecting Equipment, Structures, or Materials", "Estimating the Quantifiable Characteristics of Products, Events, or Information"] },
    { name: "Mental Processes", gwas: ["Judging the Qualities of Objects, Services, or People", "Processing Information", "Evaluating Information to Determine Compliance with Standards", "Analyzing Data or Information", "Making Decisions and Solving Problems", "Thinking Creatively", "Updating and Using Relevant Knowledge", "Developing Objectives and Strategies", "Scheduling Work and Activities", "Organizing, Planning, and Prioritizing Work"] },
    { name: "Work Output", gwas: ["Performing General Physical Activities", "Handling and Moving Objects", "Controlling Machines and Processes", "Operating Vehicles, Mechanized Devices, or Equipment", "Working with Computers", "Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment", "Repairing and Maintaining Mechanical Equipment", "Repairing and Maintaining Electronic Equipment", "Documenting/Recording Information"] },
    { name: "Interacting with Others", gwas: ["Interpreting the Meaning of Information for Others", "Communicating with Supervisors, Peers, or Subordinates", "Communicating with People Outside the Organization", "Establishing and Maintaining Interpersonal Relationships", "Assisting and Caring for Others", "Selling or Influencing Others", "Resolving Conflicts and Negotiating with Others", "Performing for or Working Directly with the Public", "Coordinating the Work and Activities of Others", "Developing and Building Teams", "Training and Teaching Others", "Guiding, Directing, and Motivating Subordinates", "Coaching and Developing Others", "Providing Consultation and Advice to Others", "Performing Administrative Activities", "Staffing Organizational Units", "Monitoring and Controlling Resources"] }
  ];
  // Activities people do a lot in chat get bigger illustrative shares.
  const CHAT_HEAVY = { "Getting Information": 9, "Processing Information": 7, "Analyzing Data or Information": 8, "Thinking Creatively": 7,
    "Working with Computers": 9, "Documenting/Recording Information": 8, "Interpreting the Meaning of Information for Others": 6,
    "Providing Consultation and Advice to Others": 6, "Training and Teaching Others": 5, "Making Decisions and Solving Problems": 6,
    "Communicating with People Outside the Organization": 4, "Updating and Using Relevant Knowledge": 4 };

  // ---------- state ----------
  const activeIndicator = {};
  const fields = [];
  let saveTimer = null;
  let view = "objectives";
  const combo = { sel: [], priorities: [] };

  // ---------- helpers ----------
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (k === "text") n.textContent = v;
      else if (v === true) n.setAttribute(k, "");
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    (children || []).forEach(c => c && n.appendChild(c));
    return n;
  }
  const $ = sel => document.querySelector(sel);
  const cssId = s => String(s).replace(/[^A-Za-z0-9_-]/g, "_");
  const fmt = n => Number(n).toLocaleString("en-US");
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
  }
  function storage(action, value) {
    try {
      if (action === "get") return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (action === "set") localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      if (action === "clear") localStorage.removeItem(DRAFT_KEY);
    } catch (e) { /* storage unavailable: the survey still works, just without drafts */ }
    return null;
  }
  const dataCache = {};
  function loadJson(url) {
    if (!dataCache[url]) dataCache[url] = fetch(url, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    return dataCache[url];
  }

  // ---------- questions ----------
  function renderQuestion(q, prefix, meta) {
    const name = prefix + q.id;
    const errId = "err_" + cssId(name);
    const hintId = q.hint ? "hint_" + cssId(name) : null;
    const describedBy = [hintId, errId].filter(Boolean).join(" ");
    const isGroup = ["single", "multiple", "scale"].includes(q.type);
    const wrap = el(isGroup ? "fieldset" : "div", { class: "q", "data-field": name });
    const labelNode = el(isGroup ? "legend" : "label", { class: "q-label", for: isGroup ? null : "f_" + cssId(name) });
    labelNode.appendChild(document.createTextNode(q.label));
    if (q.required) labelNode.appendChild(el("span", { class: "req", "aria-hidden": "true", text: "*" }));
    wrap.appendChild(labelNode);
    if (q.hint) wrap.appendChild(el("p", { class: "q-hint", id: hintId, text: q.hint }));
    const body = el("div", { class: "q-body" });
    if (q.type === "scale") {
      const row = el("div", { class: "scale" });
      (q.options || []).forEach(opt => row.appendChild(el("label", null, [
        el("input", { type: "radio", name, value: opt, "aria-describedby": describedBy }), el("span", { text: opt })])));
      body.appendChild(row);
    } else if (q.type === "single" || q.type === "multiple") {
      const t = q.type === "single" ? "radio" : "checkbox";
      (q.options || []).forEach(opt => body.appendChild(el("label", { class: "opt" }, [
        el("input", { type: t, name, value: opt, "aria-describedby": describedBy }), el("span", { text: opt })])));
      if (q.allowOther) {
        body.appendChild(el("label", { class: "opt" }, [
          el("input", { type: t, name, value: OTHER, "aria-describedby": describedBy }), el("span", { text: q.otherLabel || "Other (please specify)" })]));
        body.appendChild(el("input", { type: "text", class: "other-input", id: "f_" + cssId(name) + "_other", "aria-label": "Please specify", placeholder: "Please specify", maxlength: 500, hidden: true }));
      }
    } else if (q.type === "textarea") {
      body.appendChild(el("textarea", { id: "f_" + cssId(name), name, maxlength: q.maxLength || 4000, "aria-describedby": describedBy }));
    } else {
      const t = ["email", "number"].includes(q.type) ? q.type : "text";
      body.appendChild(el("input", { type: t, id: "f_" + cssId(name), name, "aria-describedby": describedBy, maxlength: t === "number" ? null : (q.maxLength || 500), min: q.min, max: q.max }));
    }
    wrap.appendChild(body);
    wrap.appendChild(el("div", { class: "err", id: errId, "aria-live": "polite" }));
    fields.push(Object.assign({ name, q, prefix }, meta));
    return wrap;
  }
  function rawValue(f) {
    const form = $("#survey");
    if (["single", "scale"].includes(f.q.type)) { const c = form.querySelector(`input[name="${f.name}"]:checked`); return c ? c.value : ""; }
    if (f.q.type === "multiple") return Array.from(form.querySelectorAll(`input[name="${f.name}"]:checked`)).map(i => i.value);
    const n = document.getElementById("f_" + cssId(f.name)); return n ? n.value.trim() : "";
  }
  const otherBox = f => document.getElementById("f_" + cssId(f.name) + "_other");
  const otherText = f => (otherBox(f) ? otherBox(f).value.trim() : "");
  const isEmpty = v => (Array.isArray(v) ? v.length === 0 : v === "");
  const hasOther = v => (Array.isArray(v) ? v.includes(OTHER) : v === OTHER);
  const fieldNode = f => document.querySelector(`[data-field="${f.name}"]`);
  const isShown = f => { const n = fieldNode(f); return !!n && !n.hidden; };
  function conditionMet(f) {
    const s = f.q.showIf; if (!s) return true;
    const target = fields.find(x => x.name === f.prefix + s.question);
    if (!target || !isShown(target)) return false;
    let v = rawValue(target);
    v = Array.isArray(v) ? v.map(x => (x === OTHER ? "Other" : x)) : (v === OTHER ? "Other" : v);
    if (s.answered) return !isEmpty(v);
    if ("equals" in s) return Array.isArray(v) ? v.includes(s.equals) : v === s.equals;
    if ("includes" in s) return Array.isArray(v) ? v.includes(s.includes) : v === s.includes;
    return true;
  }
  function refresh() {
    fields.forEach(f => {
      fieldNode(f).hidden = !conditionMet(f);
      const box = otherBox(f); if (box) box.hidden = !hasOther(rawValue(f));
    });
    updateProgress();
  }
  function updateProgress() {
    let count = 0;
    page.indicators.forEach(ind => {
      const done = fields.some(f => f.indicatorId === ind.id && isShown(f) && !isEmpty(rawValue(f)));
      if (done) count++;
      const btn = document.getElementById(tabId(ind));
      if (btn) { btn.classList.toggle("answered", done); btn.querySelector(".sr-state").textContent = done ? " (answered)" : ""; }
    });
    const pt = $("#progressText");
    if (pt) pt.textContent = `${count} of ${page.indicators.length} indicators answered`;
  }

  // ---------- bar chart ----------
  function renderChart(c) {
    const unit = c.unit || "";
    const bars = c.bars || [];
    const max = c.max || (unit === "%" ? 100 : Math.max(1, ...bars.map(b => b.value)));
    const fig = el("figure", { class: "chart" + (c.layout === "stacked" ? " stacked" : "") });
    const titleId = "chart_" + Math.random().toString(36).slice(2, 8);
    if (c.title) fig.appendChild(el("figcaption", { class: "chart-title", id: titleId, text: c.title }));
    const list = el("ul", { class: "bars", "aria-labelledby": c.title ? titleId : null });
    bars.forEach(b => {
      const w = Math.max(0, Math.min(100, (b.value / max) * 100));
      const valueText = (b.text != null ? b.text : b.value) + unit;
      list.appendChild(el("li", { class: "bar-row", title: `${b.label}: ${valueText}` }, [
        el("span", { class: "bar-label", text: b.label }),
        el("div", { class: "bar-track" }, [el("div", { class: "bar", style: `width:${w}%` }, [el("span", { class: "bar-value", "aria-hidden": "true", text: valueText })])]),
        el("span", { class: "sr-only", text: `: ${valueText}` })
      ]));
    });
    fig.appendChild(list);
    fig.appendChild(el("p", { class: "chart-note", text: c.note === undefined ? NOTE : [NOTE, c.note].filter(Boolean).join(" ") }));
    return fig;
  }
  function fitBarLabels() {
    document.querySelectorAll(".bar").forEach(bar => {
      if (!bar.offsetParent) return;
      bar.classList.remove("outside");
      const label = bar.querySelector(".bar-value");
      if (bar.clientWidth < label.offsetWidth + 16) bar.classList.add("outside");
    });
  }
  let fitTimer = null;
  window.addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitBarLabels, 100); });

  function renderPillGroup(g) {
    const card = el("section", { class: "pill-group" });
    if (g.title) card.appendChild(el("h3", { text: g.title }));
    if (g.note) card.appendChild(el("p", { class: "pill-note", text: g.note }));
    (g.sets || []).forEach(set => {
      if (set.label) card.appendChild(el("p", { class: "pill-set-label", text: set.label }));
      card.appendChild(el("ul", { class: "pills" }, (set.pills || []).map(p => {
        const item = typeof p === "string" ? { label: p } : p;
        return el("li", { class: "pill" }, [item.code ? el("b", { class: "pill-code", text: item.code }) : null, el("span", { text: item.label })]);
      })));
    });
    return card;
  }

  // ---------- O*NET explorer: GWA / IWA donuts, DWA / task rankings ----------
  function normalise(items) { const t = items.reduce((s, x) => s + x.value, 0) || 1; items.forEach(x => (x.value /= t)); return items; }

  function buildActivityModel(data) {
    // categories -> gwas (value) -> iwas (value) -> dwas (value); all values are shares of messages.
    const cats = data ? data.categories.map(c => ({ name: c.name, gwas: c.gwas.map(g => ({ id: g.id, name: g.name, iwas: g.iwas })) }))
                      : FALLBACK_GWAS.map(c => ({ name: c.name, gwas: c.gwas.map(n => ({ id: n, name: n, iwas: [] })) }));
    const all = [];
    cats.forEach(c => c.gwas.forEach(g => { g.value = CHAT_HEAVY[g.name] || (0.4 + C.unit("g" + g.id) * 1.6); g.cat = c.name; all.push(g); }));
    normalise(all);
    cats.forEach(c => c.gwas.forEach(g => {
      const iw = (g.iwas || []).map(i => ({ id: i.id, name: i.title, dwas: i.dwas || [], value: 0.3 + C.unit("i" + i.id), gwa: g.name }));
      const t = iw.reduce((s, x) => s + x.value, 0) || 1;
      iw.forEach(i => {
        i.value = g.value * i.value / t;
        const dw = i.dwas.map(d => ({ id: d.id, name: d.title, value: Math.pow(0.2 + C.unit("d" + d.id), 2), iwa: i.name, gwa: g.name }));
        const td = dw.reduce((s, x) => s + x.value, 0) || 1;
        dw.forEach(d => (d.value = i.value * d.value / td));
        i.dwas = dw;
      });
      g.children = iw;
    }));
    return cats;
  }

  function renderExplorer(opts) {
    const box = el("div", { class: "explorer" }, [el("p", { class: "muted", text: "Loading O*NET work activities…" })]);
    let mode = "gwa";

    loadJson(opts.data).then(d => d, () => null).then(data => {
      box.innerHTML = "";
      const cats = buildActivityModel(data);
      const counts = data ? data.counts : { gwa: 41, iwa: 332 };
      box.appendChild(el("p", { class: "lead", text: data
        ? `There are ${fmt(counts.gwa)} General Work Activities (GWAs), ${fmt(counts.iwa)} Intermediate Work Activities (IWAs) and ${fmt(counts.dwa)} Detailed Work Activities (DWAs), as of the ${data.source.replace(/ Database$/, "")} release (${data.released}).`
        : "There are 41 General Work Activities (GWAs) and 332 Intermediate Work Activities (IWAs) in O*NET." }));

      const levels = [["gwa", "GWA"], ["iwa", "IWA"], ["dwa", "DWA"], ["task", "Task"]];
      const bar = el("div", { class: "lvl-pills", role: "group", "aria-label": "Level of detail" });
      levels.forEach(([k, label]) => {
        const b = el("button", { type: "button", "aria-pressed": k === mode ? "true" : "false", text: label });
        b.addEventListener("click", () => { mode = k; bar.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); draw(); });
        bar.appendChild(b);
      });
      box.appendChild(bar);
      const stage = el("div", { class: "explorer-stage" });
      box.appendChild(stage);

      const legendFor = (kind) => el("ul", { class: "dl" }, cats.map((c, i) => {
        const share = c.gwas.reduce((s, g) => s + g.value, 0);
        const n = kind === "iwa" ? c.gwas.reduce((s, g) => s + g.children.length, 0) : c.gwas.length;
        return el("li", null, [el("i", { style: `background:${C.PALETTE[i]}` }), el("span", { text: c.name }),
          el("span", { class: "m", text: `${n} ${kind === "iwa" ? "IWAs" : "GWAs"}` }), el("b", { text: C.pct(share, 0) })]);
      }));
      const needData = what => el("p", { class: "empty", text: `The ${what} view needs the O*NET data files (data/onet_activities.json${what === "task" ? " and data/soc_tasks.json" : ""}). Add them to the repository and reload the page.` });

      function searchBlock(items, label, describe) {
        const id = "s_" + Math.random().toString(36).slice(2, 8);
        const input = el("input", { type: "search", id, placeholder: "Type at least 3 letters", autocomplete: "off" });
        const out = el("ul", { class: "results", "aria-live": "polite" });
        input.addEventListener("input", () => {
          out.innerHTML = "";
          const q = input.value.trim().toLowerCase();
          if (q.length < 3) return;
          const hits = items.filter(x => x.name.toLowerCase().includes(q) || (x.extra || "").toLowerCase().includes(q));
          hits.slice(0, 20).forEach(x => out.appendChild(el("li", null, [el("span", { class: "r-name", text: x.name }), el("span", { class: "r-meta", text: describe(x) })])));
          out.appendChild(el("li", { class: "r-count", text: hits.length ? `${fmt(hits.length)} match${hits.length === 1 ? "" : "es"}${hits.length > 20 ? ", showing the first 20" : ""}` : "No matches" }));
        });
        return el("div", { class: "search" }, [el("label", { for: id, text: label }), input, out]);
      }

      function draw() {
        stage.innerHTML = "";
        if (mode === "gwa") {
          const fig = el("figure", { class: "donut-card" }, [el("figcaption", { class: "chart-title", text: `Share of messages by General Work Activity, ${COUNTRY}` })]);
          fig.appendChild(C.donut({ label: "Donut chart of the share of messages by General Work Activity",
            center: { big: String(counts.gwa), small: "GWAs" },
            groups: cats.map((c, i) => ({ name: c.name, color: C.PALETTE[i], items: c.gwas.map(g => ({ name: g.name, value: g.value })) })) }));
          fig.appendChild(el("p", { class: "dsub", text: "By GWA category" }));
          fig.appendChild(legendFor("gwa"));
          fig.appendChild(el("p", { class: "chart-note", text: NOTE + " Hover over or tap a segment to see its name and share." }));
          stage.appendChild(fig);
        } else if (mode === "iwa") {
          if (!data) return stage.appendChild(needData("IWA"));
          const fig = el("figure", { class: "donut-card" }, [el("figcaption", { class: "chart-title", text: `Share of messages by Intermediate Work Activity, grouped by GWA, ${COUNTRY}` })]);
          fig.appendChild(C.donut({ nested: true, label: "Two-ring donut chart: General Work Activities inside, their Intermediate Work Activities outside",
            center: { big: fmt(counts.iwa), small: "IWAs" },
            groups: cats.map((c, i) => ({ name: c.name, color: C.PALETTE[i], items: c.gwas.map(g => ({ name: g.name, value: g.value, children: g.children.map(x => ({ name: x.name, value: x.value })) })) })) }));
          fig.appendChild(el("p", { class: "dsub", text: "By GWA category" }));
          fig.appendChild(legendFor("iwa"));
          const iwas = cats.flatMap(c => c.gwas.flatMap(g => g.children)).sort((a, b) => b.value - a.value).slice(0, 10);
          fig.appendChild(el("p", { class: "dsub", text: "Largest IWAs" }));
          fig.appendChild(el("ol", { class: "rank" }, iwas.map(x => el("li", null, [
            el("span", { class: "r-name", text: x.name }), el("span", { class: "r-meta", text: x.gwa }), el("b", { text: C.pct(x.value) })]))));
          fig.appendChild(el("p", { class: "chart-note", text: NOTE + " The inner ring shows each IWA's GWA. Hover over or tap a segment to see its name and share." }));
          stage.appendChild(fig);
        } else if (mode === "dwa") {
          if (!data) return stage.appendChild(needData("DWA"));
          const dwas = cats.flatMap(c => c.gwas.flatMap(g => g.children.flatMap(i => i.dwas))).sort((a, b) => b.value - a.value);
          const top = dwas.slice(0, 15);
          stage.appendChild(renderChart({ layout: "stacked", unit: "%", title: `The 15 largest Detailed Work Activities by share of messages, ${COUNTRY}`,
            max: top[0].value * 100, bars: top.map(d => ({ label: d.name, value: d.value * 100, text: (d.value * 100).toFixed(2) })),
            note: `There are ${fmt(dwas.length)} DWAs in total; search for any of them below.` }));
          stage.appendChild(searchBlock(dwas, "Search all DWAs", x => `${x.iwa} › ${x.gwa} · ${(x.value * 100).toFixed(3)}%`));
        } else {
          stage.appendChild(el("p", { class: "muted", text: "Loading O*NET task statements…" }));
          if (!opts.tasks) return;
          loadJson(opts.tasks).then(t => {
            if (mode !== "task") return;
            stage.innerHTML = "";
            const tasks = [];
            t.majorGroups.forEach(g => g.occupations.forEach(o => o.tasks.forEach(x => tasks.push({
              name: x.task, occ: o.title, group: g.title, extra: o.title, value: Math.pow(C.unit("t" + x.id + o.code), 6) }))));
            normalise(tasks);
            tasks.sort((a, b) => b.value - a.value);
            const top = tasks.slice(0, 15);
            stage.appendChild(renderChart({ layout: "stacked", unit: "%", title: `The 15 largest O*NET tasks by share of messages, ${COUNTRY}`,
              max: top[0].value * 100, bars: top.map(d => ({ label: d.name, value: d.value * 100, text: (d.value * 100).toFixed(3) })),
              note: `There are ${fmt(tasks.length)} task statements across ${fmt(t.counts.occupations)} occupations in the 23 SOC major groups; search for any of them below.` }));
            stage.appendChild(searchBlock(tasks, "Search tasks or occupations", x => `${x.occ} · ${x.group}`));
            fitBarLabels();
          }).catch(() => { if (mode === "task") { stage.innerHTML = ""; stage.appendChild(needData("task")); } });
        }
        fitBarLabels();
      }
      draw();
    });
    return box;
  }

  function renderLeft(ind) {
    const left = el("div", { class: "panel-left" });
    const inner = el("div", { class: "left-inner" }, [el("h2", { text: ind.title || ind.label })]);
    const s = ind.show;
    if (!s) {
      inner.appendChild(el("p", { class: "empty", text: "An example of the measurements this indicator would allow will be added soon. You can still tell us how relevant it is." }));
    } else {
      if (s.summary) inner.appendChild(el("p", { class: "summary", text: s.summary }));
      if (s.lead) inner.appendChild(el("p", { class: "lead", text: s.lead }));
      if (s.explorer) { left.classList.add("long"); inner.appendChild(renderExplorer(s.explorer)); }
      if (s.chart) inner.appendChild(renderChart(s.chart));
      (s.pillGroups || []).forEach(g => inner.appendChild(renderPillGroup(g)));
      if (s.heading) inner.appendChild(el("h3", { text: s.heading }));
      const paras = Array.isArray(s.text) ? s.text : (s.text ? [s.text] : []);
      if (paras.length) inner.appendChild(el("div", { class: "body" }, paras.map(t => el("p", { text: t }))));
    }
    left.appendChild(inner);
    return left;
  }

  // ---------- single indicators view ----------
  const tabId = ind => "tab_" + cssId(ind.id);
  const panelId = ind => "panel_" + cssId(ind.id);

  function renderSingleView() {
    const section = el("section", { class: "view", id: "view_single", role: "tabpanel", "aria-labelledby": "vt_single" });
    const selector = el("div", { class: "selector", id: "selector" });
    selector.appendChild(el("div", { class: "selector-top" }, [
      el("h2", { class: "section-label", id: "selhint", text: "Choose an indicator" }),
      el("p", { class: "progress-text", id: "progressText", "aria-live": "polite" })
    ]));
    const list = el("div", { class: "ind-list", role: "tablist", "aria-labelledby": "selhint" });
    page.indicators.forEach(ind => {
      const btn = el("button", { type: "button", class: "ind-btn", role: "tab", id: tabId(ind), "aria-controls": panelId(ind), "aria-selected": "false", tabindex: "-1" }, [
        el("span", { class: "mark", "aria-hidden": "true" }), el("span", { text: ind.label || ind.title }), el("span", { class: "sr-state sr-only" })]);
      btn.addEventListener("click", () => selectIndicator(ind.id, true));
      list.appendChild(btn);
    });
    list.addEventListener("keydown", e => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const ids = page.indicators.map(x => x.id);
      let idx = ids.indexOf(activeIndicator.id);
      if (e.key === "Home") idx = 0; else if (e.key === "End") idx = ids.length - 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") idx = (idx - 1 + ids.length) % ids.length; else idx = (idx + 1) % ids.length;
      selectIndicator(ids[idx], true);
      document.getElementById(tabId(page.indicators[idx])).focus();
    });
    selector.appendChild(list);
    section.appendChild(selector);

    page.indicators.forEach((ind, k) => {
      const prefix = ind.id + "__";
      const panel = el("div", { class: "panel", role: "tabpanel", id: panelId(ind), "aria-labelledby": tabId(ind), hidden: true });
      panel.appendChild(renderLeft(ind));
      const qs = el("div", { class: "panel-right" });
      const meta = { indicatorId: ind.id };
      (ind.questionsBefore || []).concat(page.commonQuestions || [], ind.questions || []).forEach(q => qs.appendChild(renderQuestion(q, prefix, meta)));
      const nav = el("div", { class: "panel-nav" });
      const prev = page.indicators[k - 1], next = page.indicators[k + 1];
      if (prev) { const b = el("button", { type: "button", class: "btn btn-secondary", text: "Previous: " + prev.label }); b.addEventListener("click", () => selectIndicator(prev.id, true, true)); nav.appendChild(b); }
      nav.appendChild(el("span", { class: "spacer" }));
      if (next) { const b = el("button", { type: "button", class: "btn btn-secondary", text: "Next: " + next.label }); b.addEventListener("click", () => selectIndicator(next.id, true, true)); nav.appendChild(b); }
      qs.appendChild(nav);
      panel.appendChild(qs);
      section.appendChild(panel);
    });
    return section;
  }

  function renderObjectivesView() {
    const section = el("section", { class: "view objectives", id: "view_objectives", role: "tabpanel", "aria-labelledby": "vt_objectives", hidden: true });
    const content = el("div", { class: "objectives-copy" });
    content.appendChild(el("h2", { class: "section-label", text: "Objectives" }));
    content.appendChild(el("p", { text: "The Global AI Adoption Index is a joint initiative between international organizations and leading technology companies to establish the first harmonized, multi-company measurement system for global generative AI adoption, informed by stakeholder input. The initiative is building a coalition and infrastructure durable enough to publish AI Adoption indices as a quarterly recurring statistical output for global public consumption, with support from the World Bank Group, OECD, and the IMF." }));
    content.appendChild(el("p", { text: "The initiative is structured around three workstreams – Technical Committee, Stakeholder Consultation, and Supplemental Research." }));
    content.appendChild(el("h3", { text: "We want you to help us" }));
    content.appendChild(el("ul", { class: "objective-list" }, [el("li", { text: "Prioritize and substantiate the indicators that would be most useful to you. For each indicator, we outline what you may see in the AI Index and ask you questions about its usefulness." })]));
    section.appendChild(content);
    return section;
  }

  function selectIndicator(indId, updateHash, scroll) {
    activeIndicator.id = indId;
    page.indicators.forEach(ind => {
      const on = ind.id === indId;
      const btn = document.getElementById(tabId(ind));
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
      document.getElementById(panelId(ind)).hidden = !on;
    });
    fitBarLabels();
    if (updateHash) { try { history.replaceState(null, "", "#" + indId); } catch (e) {} scheduleSave(); }
    if (scroll) {
      const sel = $("#selector");
      if (sel.getBoundingClientRect().top < 0) sel.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  // ---------- indicator combinations view ----------
  const comboInd = id => combosCfg.indicators.find(x => x.id === id);
  const comboName = ids => ids.map(id => { const x = comboInd(id); return x ? (x.short || x.label) : id; }).join(" → ");

  function comboModel(ids) {
    const inds = ids.map(comboInd);
    const key = ids.join("+");
    const paths = [];
    (function walk(c, k, v) {
      if (c === inds.length) { paths.push({ k: k.slice(), v: v * (0.6 + 0.8 * C.unit(key + ":" + k.join("."))) }); return; }
      const w = inds[c].weights, t = w.reduce((s, x) => s + x, 0);
      inds[c].cats.forEach((_, i) => { k.push(i); walk(c + 1, k, v * w[i] / t); k.pop(); });
    })(0, [], 1);
    const total = paths.reduce((s, p) => s + p.v, 0);
    paths.forEach(p => (p.v /= total));
    // Highlight: the most common category at each step, given the steps before it.
    const hl = []; let pool = paths;
    inds.forEach((ind, c) => {
      let best = 0, bv = -1;
      ind.cats.forEach((name, i) => {
        if (/^Other/.test(name)) return;   // the sentence describes a named category, never "Other …"
        const v = pool.filter(p => p.k[c] === i).reduce((s, p) => s + p.v, 0); if (v > bv) { bv = v; best = i; }
      });
      hl.push(best); pool = pool.filter(p => p.k[c] === best);
    });
    const shares = hl.map((cat, c) => {
      const base = paths.filter(p => hl.slice(0, c).every((x, j) => p.k[j] === x));
      const hit = base.filter(p => p.k[c] === cat);
      return hit.reduce((s, p) => s + p.v, 0) / (base.reduce((s, p) => s + p.v, 0) || 1);
    });
    return { inds, paths, hl, shares };
  }
  function phraseFor(ind, cat) {
    let x = ind.words && ind.words[cat] ? ind.words[cat] : cat;
    if (ind.stripCode) x = x.replace(/\s*\([A-Z]\)$/, "");
    if (ind.lower && !(ind.words && ind.words[cat])) x = x.replace(/^Other /, "other ").toLowerCase().replace(/\bict\b/, "ICT");
    return (ind.phrase || "are {x}").replace("{x}", x);
  }
  function storyNodes(model) {
    const p = model.shares.map(s => Math.round(s * 100) + "%");
    const ph = model.inds.map((ind, c) => phraseFor(ind, ind.cats[model.hl[c]]));
    const out = [document.createTextNode(`In ${COUNTRY}, `), el("b", { text: p[0] }), document.createTextNode(` of messages ${ph[0]}.`)];
    if (ph.length > 1) {
      out.push(document.createTextNode(" Of those, "), el("b", { text: p[1] }), document.createTextNode(` ${ph[1]}`));
      for (let i = 2; i < ph.length; i++) {
        out.push(document.createTextNode(i === ph.length - 1 ? ", and " : ", "), el("b", { text: p[i] }), document.createTextNode(` of those ${ph[i]}`));
      }
      out.push(document.createTextNode("."));
    }
    return out;
  }

  function renderCombosView() {
    const section = el("section", { class: "view", id: "view_combos", role: "tabpanel", "aria-labelledby": "vt_combos", hidden: true });
    if (!combosCfg) return section;
    const builder = el("div", { class: "builder" });
    builder.appendChild(el("h2", { class: "section-label", text: combosCfg.title || "Build an indicator combination" }));
    if (combosCfg.intro) builder.appendChild(el("p", { class: "pick-note", text: combosCfg.intro }));

    const panel = el("div", { class: "panel combo-builder-panel" });
    const left = el("div", { class: "panel-left long" });
    const leftInner = el("div", { class: "left-inner" });
    const right = el("div", { class: "panel-right combo-survey" });
    left.appendChild(leftInner);
    panel.appendChild(left);
    panel.appendChild(right);
    builder.appendChild(panel);

    const pillRow = el("div", { class: "ipills", role: "group", "aria-label": "Indicators in this combination" });
    const pickStatus = el("p", { class: "pick-status", "aria-live": "polite" });
    const chartSlot = el("div", { class: "combo-chart" });
    leftInner.appendChild(pillRow);
    leftInner.appendChild(pickStatus);
    leftInner.appendChild(chartSlot);

    // builder questions (not saved on their own: they travel with each priority)
    const bq = el("div", { class: "card builder-q" });
    const usefulName = "builder_useful";
    const qUseful = (combosCfg.builderQuestions || [])[0], qUse = (combosCfg.builderQuestions || [])[1];
    const usefulSet = el("fieldset", { class: "q" }, [el("legend", { class: "q-label", text: qUseful ? qUseful.label : "Is this combination useful to you?" }),
      el("div", { class: "scale" }, (qUseful ? qUseful.options : ["Yes", "Somewhat", "No", "Not sure"]).map(o => el("label", null, [el("input", { type: "radio", name: usefulName, value: o }), el("span", { text: o })])))]);
    const useArea = el("textarea", { id: "builder_use_for", maxlength: 2000 });
    const addBtn = el("button", { type: "button", class: "btn btn-primary", text: "Add to my priorities" });
    const addMsg = el("p", { class: "add-msg", "aria-live": "polite" });
    bq.appendChild(usefulSet);
    bq.appendChild(el("div", { class: "q" }, [el("label", { class: "q-label", for: "builder_use_for", text: qUse ? qUse.label : "What would you use it for?" }), useArea]));
    bq.appendChild(el("div", { class: "actions" }, [addBtn]));
    bq.appendChild(addMsg);
    const dataBox = el("details", { class: "data" }, [el("summary", { text: "See example data" })]);
    leftInner.appendChild(dataBox);

    const prioCard = el("div", { class: "card" }, [el("h3", { text: "Your priority combinations" }),
      el("p", { class: "pick-note", text: `Put the combination you need most at the top. You can add up to ${combosCfg.maxPriorities || 5}.` })]);
    const prioList = el("ol", { class: "prio" });
    prioCard.appendChild(prioList);
    right.appendChild(prioCard);
    right.appendChild(bq);
    section.appendChild(builder);

    function drawPills() {
      pillRow.innerHTML = "";
      const max = combosCfg.max || 4;
      combosCfg.indicators.forEach(ind => {
        const pos = combo.sel.indexOf(ind.id);
        const on = pos >= 0, full = combo.sel.length >= max;
        const b = el("button", { type: "button", class: "ipill" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false",
          disabled: ind.disabled || (!on && full) ? true : null, title: ind.disabled ? ind.disabledNote : null }, [
          el("span", { class: "n", "aria-hidden": "true", text: on ? String(pos + 1) : "" }), el("span", { text: ind.label }),
          on ? el("span", { class: "sr-only", text: `, position ${pos + 1}` }) : null]);
        b.addEventListener("click", () => {
          const i = combo.sel.indexOf(ind.id);
          if (i >= 0) combo.sel.splice(i, 1); else if (combo.sel.length < max) combo.sel.push(ind.id);
          drawPills(); drawChart(); scheduleSave();
          const again = pillRow.querySelectorAll("button")[combosCfg.indicators.indexOf(ind)]; if (again) again.focus();
        });
        pillRow.appendChild(b);
      });
      const dis = combosCfg.indicators.filter(x => x.disabled).map(x => `${x.label}: ${x.disabledNote}`).join(" ");
      pickStatus.textContent = (combo.sel.length ? `Selected: ${comboName(combo.sel)}.` : "No indicators selected yet.") +
        (combo.sel.length >= max ? ` That's the maximum of ${max}; remove one to pick another.` : "") + (dis ? " " + dis : "");
    }

    function drawChart() {
      chartSlot.innerHTML = "";
      dataBox.querySelectorAll("table, p").forEach(n => n.remove());
      addMsg.textContent = "";
      if (combo.sel.length < 2) {
        chartSlot.appendChild(el("p", { class: "empty-card", text: "Pick at least two indicators to see how messages would flow between them." }));
        dataBox.hidden = true; addBtn.disabled = true;
        return;
      }
      dataBox.hidden = false; addBtn.disabled = false;
      const m = comboModel(combo.sel);
      const first = m.inds[0];
      const colors = first.cats.map((c, i) => /^Other/.test(c) ? C.OTHER : C.PALETTE[i % C.PALETTE.length]);
      const fig = el("figure", { class: "sankey-card" }, [el("figcaption", { class: "chart-title", text: `How messages flow across your ${m.inds.length} indicators, ${COUNTRY}` })]);
      fig.appendChild(C.sankey({ columns: m.inds.map(x => ({ name: x.short || x.label, cats: x.cats })), paths: m.paths, colors, highlight: m.hl,
        label: `Sankey chart of messages by ${comboName(combo.sel)}` }));
      fig.appendChild(el("div", { class: "legend" }, first.cats.map((c, i) => el("span", null, [el("i", { style: `background:${colors[i]}` }), document.createTextNode(c)]))
        .concat([el("span", { class: "muted", text: `Band colour shows ${(first.short || first.label).toLowerCase()}. Band width shows the share of messages. The darker path matches the sentence below.` })])));
      fig.appendChild(el("p", { class: "chart-note", text: [NOTE].concat(m.inds.map(x => x.note).filter(Boolean)).join(" ") }));
      chartSlot.appendChild(fig);
      chartSlot.appendChild(el("p", { class: "story" }, storyNodes(m)));
      // example data
      const top = m.paths.slice().sort((a, b) => b.v - a.v).slice(0, 8);
      dataBox.appendChild(el("p", { class: "pick-note", text: "The most common combinations of categories, as a data user would receive them." }));
      const tbl = el("table", { class: "ex" }, [
        el("thead", null, [el("tr", null, m.inds.map(x => el("th", { scope: "col", text: x.short || x.label })).concat([el("th", { scope: "col", class: "num", text: "Share of messages" })]))]),
        el("tbody", null, top.map(p => el("tr", null, p.k.map((x, c) => el("td", { text: m.inds[c].cats[x] })).concat([el("td", { class: "num", text: (p.v * 100).toFixed(1) + "%" })]))))
      ]);
      dataBox.appendChild(el("div", { class: "table-scroll" }, [tbl]));
    }

    function drawPriorities() {
      prioList.innerHTML = "";
      if (!combo.priorities.length) {
        prioList.appendChild(el("li", { class: "prio-empty", text: "No combinations yet. Build one, then select “Add to my priorities”." }));
        return;
      }
      combo.priorities.forEach((p, i) => {
        const move = (d) => { const j = i + d; if (j < 0 || j >= combo.priorities.length) return; [combo.priorities[i], combo.priorities[j]] = [combo.priorities[j], combo.priorities[i]]; drawPriorities(); scheduleSave(); const btn = prioList.querySelectorAll("li")[j].querySelector(d < 0 ? ".up" : ".down"); if (btn && !btn.disabled) btn.focus(); };
        const name = comboName(p.ids);
        const up = el("button", { type: "button", class: "up", "aria-label": `Move ${name} up`, disabled: i === 0 ? true : null, text: "↑" });
        const down = el("button", { type: "button", class: "down", "aria-label": `Move ${name} down`, disabled: i === combo.priorities.length - 1 ? true : null, text: "↓" });
        const rm = el("button", { type: "button", "aria-label": `Remove ${name}`, text: "✕" });
        up.addEventListener("click", () => move(-1));
        down.addEventListener("click", () => move(1));
        rm.addEventListener("click", () => { combo.priorities.splice(i, 1); drawPriorities(); scheduleSave(); });
        prioList.appendChild(el("li", null, [
          el("span", { class: "rk", text: String(i + 1) }),
          el("span", { class: "nm" }, [el("span", { text: name }),
            (p.useful || p.use_for) ? el("span", { class: "pm", text: [p.useful ? `Useful: ${p.useful}` : "", p.use_for].filter(Boolean).join(" · ") }) : null]),
          el("span", { class: "ctl" }, [up, down, rm])
        ]));
      });
    }

    addBtn.addEventListener("click", () => {
      const max = combosCfg.maxPriorities || 5;
      if (combo.sel.length < 2) { addMsg.textContent = "Pick at least two indicators first."; return; }
      if (combo.priorities.some(p => p.ids.join() === combo.sel.join())) { addMsg.textContent = "This combination is already in your priorities."; return; }
      if (combo.priorities.length >= max) { addMsg.textContent = `You can add up to ${max} combinations. Remove one to add another.`; return; }
      const u = section.querySelector(`input[name="${usefulName}"]:checked`);
      combo.priorities.push({ ids: combo.sel.slice(), useful: u ? u.value : "", use_for: useArea.value.trim() });
      section.querySelectorAll(`input[name="${usefulName}"]`).forEach(x => (x.checked = false));
      useArea.value = "";
      addMsg.textContent = `Added “${comboName(combo.sel)}” as priority ${combo.priorities.length}.`;
      drawPriorities(); scheduleSave();
    });

    // featured combination with its own questions
    const f = combosCfg.featured;
    if (f) {
      const wrap = el("div", { class: "featured" }, [el("h2", { class: "section-label", text: "A combination we would like your view on" })]);
      const panel = el("div", { class: "panel" });
      const left = el("div", { class: "panel-left" });
      const inner = el("div", { class: "left-inner" }, [el("h2", { text: f.title })]);
      if (f.pills) inner.appendChild(el("div", { class: "combo-pills" }, f.pills.flatMap((p, i) => [i ? el("span", { class: "plus", "aria-hidden": "true", text: "+" }) : null, el("span", { class: "pill", text: p })]).filter(Boolean)));
      if (f.summary) inner.appendChild(el("p", { class: "summary", text: f.summary }));
      if (f.chart) {
        const fig = el("figure", { class: "chart" }, [el("figcaption", { class: "chart-title", text: f.chart.title })]);
        fig.appendChild(el("div", { class: "sm-scroll" }, [C.smallMultiples({ label: f.chart.title, rows: f.chart.rows, panels: f.chart.panels.map(p => ({ name: p.name, values: p.values.map(v => v / 100) })) })]));
        fig.appendChild(el("p", { class: "chart-note", text: [NOTE, f.chart.note].filter(Boolean).join(" ") }));
        inner.appendChild(fig);
      }
      left.appendChild(inner);
      const right = el("div", { class: "panel-right" });
      (f.questions || []).forEach(q => right.appendChild(renderQuestion(q, f.id + "__", { indicatorId: null })));
      panel.appendChild(left); panel.appendChild(right);
      wrap.appendChild(panel);
      section.appendChild(wrap);
    }

    section._redraw = () => { drawPills(); drawChart(); drawPriorities(); };
    return section;
  }

  function setView(v, updateHash) {
    view = v;
    $("#view_objectives").hidden = v !== "objectives";
    $("#view_single").hidden = v !== "single";
    $("#view_combos").hidden = v !== "combos";
    [["vt_objectives", "objectives"], ["vt_single", "single"], ["vt_combos", "combos"]].forEach(([id, k]) => {
      const t = document.getElementById(id); t.setAttribute("aria-selected", k === v ? "true" : "false"); t.tabIndex = k === v ? 0 : -1;
    });
    fitBarLabels();
    if (updateHash) { try { history.replaceState(null, "", v === "combos" ? "#combinations" : v === "objectives" ? "#objectives" : "#" + (activeIndicator.id || "")); } catch (e) {} scheduleSave(); }
  }

  // ---------- page ----------
  function render() {
    app.innerHTML = "";
    fields.length = 0;
    const h = $("#heroTitle"), s = $("#heroIntro");
    if (h) h.textContent = page.title || cfg.siteTitle || "";
    if (s) s.textContent = page.intro || "";
    if (cfg.siteTitle) { document.title = cfg.siteTitle; const t = $("#siteTitle"); if (t) t.textContent = cfg.siteTitle; }

    if (testMode) {
      app.appendChild(el("div", { class: "alert alert-warning", role: "note" }, [el("div", null, [
        el("p", { class: "at", text: "Test mode" }),
        el("p", { class: "ab", text: "No endpoint URL is set in questions.js, so answers are not sent anywhere. Submitting shows the data that would be sent." })])]));
    }

    const form = el("form", { id: "survey", novalidate: true });
    if (combosCfg) {
      const tabs = el("div", { class: "view-tabs", role: "tablist", "aria-label": "Survey sections" });
      [["vt_objectives", "Objectives", "objectives", "view_objectives"], ["vt_single", "Single indicators", "single", "view_single"], ["vt_combos", "Indicator combinations", "combos", "view_combos"]].forEach(([id, label, k, ctl]) => {
        const b = el("button", { type: "button", role: "tab", id, "aria-controls": ctl, "aria-selected": "false", tabindex: "-1", text: label });
        b.addEventListener("click", () => setView(k, true));
        tabs.appendChild(b);
      });
      tabs.addEventListener("keydown", e => {
        if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        e.preventDefault();
        const views = ["objectives", "single", "combos"];
        const offset = e.key === "ArrowRight" ? 1 : -1;
        const nv = views[(views.indexOf(view) + offset + views.length) % views.length];
        setView(nv, true); document.getElementById("vt_" + nv).focus();
      });
      form.appendChild(tabs);
    }
    form.appendChild(renderObjectivesView());
    form.appendChild(renderSingleView());
    const combosView = renderCombosView();
    form.appendChild(combosView);

    form.appendChild(el("div", { class: "hp", "aria-hidden": "true" }, [
      el("label", { for: "hp_website", text: "Leave this field empty" }),
      el("input", { type: "text", id: "hp_website", name: "website", tabindex: "-1", autocomplete: "off" })]));
    form.appendChild(el("div", { class: "submit-bar" }, [
      el("p", { class: "submit-note", text: "Your answers are saved in this browser as you type, so you can come back later. They are only sent when you select “" + (cfg.submitLabel || "Submit") + "”." }),
      el("div", { class: "submit-actions" }, [el("button", { type: "submit", class: "btn btn-primary", id: "submitBtn", text: cfg.submitLabel || "Submit" })]),
      el("p", { class: "form-error", id: "formError", role: "alert" })]));
    form.addEventListener("input", onInput);
    form.addEventListener("change", onInput);
    form.addEventListener("submit", onSubmit);
    app.appendChild(form);

    const draft = storage("get");
    const hash = decodeURIComponent((location.hash || "").slice(1));
    const ids = page.indicators.map(x => x.id);
    let start = ids[0];
    if (draft && ids.includes(draft.active)) start = draft.active;
    if (ids.includes(hash)) start = hash;
    selectIndicator(start, false);
    if (draft) restoreDraft(draft);
    if (combosView._redraw) combosView._redraw();
    refresh();
    let v0 = draft && ["objectives", "single", "combos"].includes(draft.view) ? draft.view : "objectives";
    if (hash === "combinations") v0 = "combos";
    else if (hash === "objectives") v0 = "objectives";
    else if (ids.includes(hash)) v0 = "single";
    if (combosCfg) setView(v0, false);
  }

  // ---------- drafts ----------
  function collectDraft() {
    const values = {};
    fields.forEach(f => { const v = rawValue(f); if (!isEmpty(v)) values[f.name] = v; const o = otherText(f); if (o) values[f.name + "__other_text"] = o; });
    return { values, active: activeIndicator.id, view, combo: { sel: combo.sel.slice(), priorities: combo.priorities.slice() }, savedAt: Date.now() };
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 400); }
  function flushSave() { clearTimeout(saveTimer); if ($("#survey")) storage("set", collectDraft()); }
  window.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });
  function restoreDraft(d) {
    if (d.combo && combosCfg) {
      const valid = id => combosCfg.indicators.some(x => x.id === id && !x.disabled);
      combo.sel = (d.combo.sel || []).filter(valid).slice(0, combosCfg.max || 4);
      combo.priorities = (d.combo.priorities || []).filter(p => p && Array.isArray(p.ids) && p.ids.every(valid)).slice(0, combosCfg.maxPriorities || 5);
    }
    if (!d.values) return;
    const form = $("#survey");
    fields.forEach(f => {
      const v = d.values[f.name];
      if (v == null) return;
      if (["single", "scale", "multiple"].includes(f.q.type)) {
        const vals = Array.isArray(v) ? v : [v];
        form.querySelectorAll(`input[name="${f.name}"]`).forEach(i => { i.checked = vals.includes(i.value); });
      } else { const n = document.getElementById("f_" + cssId(f.name)); if (n) n.value = v; }
      const o = d.values[f.name + "__other_text"]; if (o && otherBox(f)) otherBox(f).value = o;
    });
  }

  // ---------- events ----------
  function onInput(e) {
    refresh();
    const node = e.target.closest("[data-field]");
    if (node) { const err = node.querySelector(".err"); if (err) err.textContent = ""; }
    if (e.type === "change" && e.target.value === OTHER && e.target.checked) { const f = fields.find(x => x.name === e.target.name); if (f && otherBox(f)) otherBox(f).focus(); }
    $("#formError").textContent = "";
    scheduleSave();
  }

  function validate() {
    let firstBad = null;
    fields.forEach(f => {
      const node = fieldNode(f), err = node.querySelector(".err");
      err.textContent = "";
      if (node.hidden) return;
      const v = rawValue(f);
      let msg = "";
      if (f.q.required && isEmpty(v)) msg = "Answer this question to continue.";
      if (!msg && hasOther(v) && !otherText(f)) msg = "Describe your “Other” answer.";
      if (!msg && f.q.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = "Enter an email address like name@example.org.";
      if (msg) { err.textContent = msg; if (!firstBad) firstBad = f; }
    });
    if (firstBad) {
      if (firstBad.indicatorId) { setView("single", true); selectIndicator(firstBad.indicatorId, true); } else setView("combos", true);
      const target = fieldNode(firstBad).querySelector("input, textarea"); if (target) target.focus();
      return false;
    }
    return true;
  }

  function buildPayload() {
    const out = { responseId: uuid(), submittedAt: new Date().toISOString() };
    fields.forEach(f => {
      const shown = isShown(f);
      const v = shown ? rawValue(f) : (f.q.type === "multiple" ? [] : "");
      out[f.name] = Array.isArray(v) ? v.map(x => (x === OTHER ? "Other" : x)).join("; ") : (v === OTHER ? "Other" : v);
      if (f.q.allowOther) out[f.name + "_other"] = shown && hasOther(v) ? otherText(f) : "";
    });
    if (combosCfg) {
      for (let i = 0; i < (combosCfg.maxPriorities || 5); i++) {
        const p = combo.priorities[i];
        out[`priority_${i + 1}_indicators`] = p ? comboName(p.ids) : "";
        out[`priority_${i + 1}_useful`] = p ? p.useful : "";
        out[`priority_${i + 1}_use_for`] = p ? p.use_for : "";
      }
    }
    return out;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const formErr = $("#formError");
    formErr.textContent = "";
    if ($("#hp_website").value) { showDone(); return; }
    if (!validate()) return;

    const pendingUseful = document.querySelector('input[name="builder_useful"]:checked');
    const pendingText = ($("#builder_use_for") || {}).value;
    if (combosCfg && combo.sel.length >= 2 && (pendingUseful || (pendingText || "").trim())
        && !combo.priorities.some(p => p.ids.join() === combo.sel.join())) {
      setView("combos", true);
      formErr.textContent = "You've answered questions about the combination you're building but haven't added it. Select “Add to my priorities”, or clear those answers, then submit again.";
      return;
    }
    const anyAnswer = fields.some(f => isShown(f) && !isEmpty(rawValue(f))) || combo.priorities.length > 0;
    if (!anyAnswer) { formErr.textContent = "Answer at least one question, or add a combination to your priorities, before submitting."; return; }

    const payload = buildPayload();
    if (testMode) { showTest(payload); return; }
    const btn = $("#submitBtn");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      storage("clear");
      showDone();
    } catch (err) {
      console.error("Survey submission failed:", err);
      formErr.textContent = "Your feedback wasn’t sent. Check your internet connection and select “" + (cfg.submitLabel || "Submit") + "” again. Your answers are still saved on this page.";
      btn.disabled = false; btn.textContent = cfg.submitLabel || "Submit";
    }
  }

  function showDone() {
    clearTimeout(saveTimer);
    app.innerHTML = "";
    app.appendChild(el("div", { class: "done", role: "status" }, [el("h2", { text: cfg.thankYouTitle || "Thank you" }), el("p", { text: cfg.thankYouMessage || "Your answers have been recorded." })]));
    window.scrollTo(0, 0);
  }
  function showTest(payload) {
    const json = JSON.stringify(payload, null, 2);
    flushSave();
    app.innerHTML = "";
    const copy = el("button", { type: "button", class: "btn btn-primary", text: "Copy data" });
    const back = el("button", { type: "button", class: "btn btn-secondary", text: "Back to the survey" });
    copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(json); copy.textContent = "Copied"; } catch (e) { copy.textContent = "Select the text and copy it"; } });
    back.addEventListener("click", render);
    app.appendChild(el("div", { class: "done" }, [
      el("h2", { text: "Test mode: this is what would be sent" }),
      el("p", { text: "Once an endpoint URL is set in questions.js, each submission is saved with exactly these fields. Your answers are still saved on the survey page." }),
      el("pre", { text: json }), el("div", { class: "actions" }, [copy, back])]));
    window.scrollTo(0, 0);
  }

  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBarLabels);
  window.addEventListener("hashchange", () => {
    if (!$("#survey")) return;
    const hash = decodeURIComponent((location.hash || "").slice(1));
    if (hash === "combinations" && combosCfg) setView("combos", false);
    else if (hash === "objectives") setView("objectives", false);
    else if (page.indicators.some(x => x.id === hash)) { if (combosCfg) setView("single", false); selectIndicator(hash, false); }
  });
})();