/*
  Scrolling introduction ("scrollytelling").
  The slides live in index.html. This script pins them in place, switches slide as the reader
  scrolls, carries the shared highlighted phrase from slide 1 to slide 2, and draws the arrows.
  Without JavaScript (or with reduced motion) everything still reads in order.
*/
(function () {
  "use strict";
  const story = document.getElementById("story");
  if (!story || !("IntersectionObserver" in window)) return;

  const stage = story.querySelector(".story-stage");
  const slides = Array.from(story.querySelectorAll(".slide"));
  const steps = Array.from(story.querySelectorAll(".step"));
  const dots = Array.from(story.querySelectorAll(".story-dots li"));
  const svg = story.querySelector(".story-arrows");
  const NS = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let current = -1;

  story.classList.add("is-scrolly");

  // Each slide shows every earlier sentence, small, at the top (a decorative running summary).
  slides.forEach((s, i) => {
    if (i === 0) return;
    const r = document.createElement("div");
    r.className = "recap";
    r.setAttribute("aria-hidden", "true");
    slides.slice(0, i).forEach(prev => {
      const t = prev.querySelector(".story-text");
      if (!t) return;
      const p = document.createElement("p");
      p.innerHTML = t.innerHTML;
      p.querySelectorAll("[id]").forEach(x => x.removeAttribute("id"));
      p.querySelectorAll("[data-share]").forEach(x => x.removeAttribute("data-share"));
      r.appendChild(p);
    });
    s.insertBefore(r, s.firstChild);
  });

  // Arrowhead marker
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = '<marker id="story-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>';
  svg.appendChild(defs);

  // Labels sit in the order their words appear left to right; each arrow starts at its word and
  // runs behind the text. On narrow screens the matching highlight colours link words and labels.
  // A highlighted phrase can wrap onto two lines; use the line nearest the label (if given).
  function wordRect(id, nearX) {
    const w = document.getElementById(id);
    if (!w) return null;
    const rs = Array.from(w.getClientRects());
    if (!rs.length) return w.getBoundingClientRect();
    if (nearX == null) return rs[rs.length - 1];
    return rs.slice().sort((a, b) => Math.abs(a.left + a.width / 2 - nearX) - Math.abs(b.left + b.width / 2 - nearX))[0];
  }
  function orderCallouts(wide) {
    story.querySelectorAll(".callouts").forEach(box => {
      if (!wide) { Array.from(box.children).forEach(k => (k.style.order = "")); return; }
      const kids = Array.from(box.children);
      const x = k => { const f = k.dataset.from ? k : k.querySelector("[data-from]"); const r = f && wordRect(f.dataset.from); return r ? r.left + r.width / 2 : 0; };
      kids.map(k => [k, x(k)]).sort((p, q) => p[1] - q[1]).forEach(([k], i) => (k.style.order = i));
    });
  }
  function drawArrows() {
    Array.from(svg.querySelectorAll("path.arrow")).forEach(p => p.remove());
    const wide = matchMedia("(min-width: 720px)").matches;
    // Measure with every slide in its resting position (inactive slides are shifted for the fade-in).
    story.classList.add("measuring");
    void stage.offsetHeight;
    orderCallouts(wide);
    // Labels marked data-align="word" sit centred directly under their phrase.
    story.querySelectorAll('.callout[data-align="word"]').forEach(label => {
      label.style.marginLeft = "0px";
      const w = wordRect(label.dataset.from);
      const box = label.parentElement.getBoundingClientRect();
      if (w && wide) label.style.marginLeft = Math.max(0, w.left + w.width / 2 - box.left - label.offsetWidth / 2) + "px";
    });
    if (!wide) { story.classList.remove("measuring"); return; }
    const base = stage.getBoundingClientRect();
    slides.forEach((slide, i) => {
      const text = slide.querySelector(".story-text").getBoundingClientRect();
      slide.querySelectorAll(".callout[data-from]").forEach(label => {
        const l = label.getBoundingClientRect();
        const w = wordRect(label.dataset.from, l.left + l.width / 2);
        if (!w || !l.width || !w.width) return;
        const x0 = w.left + w.width / 2 - base.left, y0 = w.bottom - base.top + 4;
        let d;
        if (l.bottom <= w.top) {
          // Label above its phrase: a straight arrow up from the phrase.
          d = `M${x0},${w.top - base.top - 4} L${x0},${l.bottom - base.top + 6}`;
        } else if (label.dataset.attach === "left") {
          // Down the left margin, then in from the side, clear of the cards above it.
          const col = label.parentElement.getBoundingClientRect();
          const x1 = l.left - base.left - 8, y1 = l.top + l.height / 2 - base.top;
          const bend = col.left - base.left - 18;
          d = `M${x0},${y0} C${x0},${y0 + 14} ${bend},${y0 + 4} ${bend},${y0 + 28} L${bend},${y1 - 14} Q${bend},${y1} ${x1},${y1}`;
        } else {
          const x1 = Math.max(l.left + 24, Math.min(x0, l.right - 24)) - base.left, y1 = l.top - base.top - 8;
          const my = (y0 + y1) / 2;
          d = `M${x0},${y0} C${x0},${my} ${x1},${my} ${x1},${y1}`;
        }
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("class", "arrow");
        p.setAttribute("data-slide", i);
        p.setAttribute("marker-end", "url(#story-head)");
        svg.appendChild(p);
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = i === current ? 0 : len;
        p.classList.toggle("on", i === current);
      });
    });
    story.classList.remove("measuring");
  }

  // Slide 1 → 2: the shared highlighted phrase glides into its new place.
  function carryPhrase(from, to) {
    if (reduce.matches) return;
    const a = slides[from] && slides[from].querySelector("[data-share]");
    const b = slides[to] && slides[to].querySelector("[data-share]");
    if (!a || !b || a.dataset.share !== b.dataset.share) return;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const dx = ra.left - rb.left, dy = ra.top - rb.top, sc = ra.height / rb.height;
    b.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sc})`, transformOrigin: "left top" },
               { transform: "none", transformOrigin: "left top" }],
              { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" });
  }

  function show(i) {
    if (i === current) return;
    const prev = current;
    current = i;
    slides.forEach((s, k) => {
      s.classList.toggle("is-active", k === i);
      s.setAttribute("aria-hidden", k === i ? "false" : "true");
      s.querySelectorAll("a, button").forEach(x => (x.tabIndex = k === i ? 0 : -1));
    });
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
    svg.querySelectorAll("path.arrow").forEach(p => {
      const on = Number(p.dataset.slide) === i;
      p.style.transitionDelay = on ? "300ms" : "0ms";
      p.style.strokeDashoffset = on ? 0 : p.getTotalLength();
      p.classList.toggle("on", on);
    });
    story.classList.toggle("at-end", i === slides.length - 1);
    if (prev === 0 && i === 1) carryPhrase(0, 1);
    if (prev === 1 && i === 0) carryPhrase(1, 0);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) show(Number(e.target.dataset.step)); });
  }, { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach(s => io.observe(s));

  // If any slide is taller than the screen (small phones, big text settings), don't pin:
  // the slides then simply scroll one after another so nothing is cut off.
  function fit() {
    story.classList.add("is-scrolly");
    const tooTall = slides.some(s => s.scrollHeight > stage.clientHeight + 1);
    story.classList.toggle("is-scrolly", !tooTall);
    slides.forEach(s => { if (tooTall) { s.removeAttribute("aria-hidden"); s.querySelectorAll("a, button").forEach(x => (x.tabIndex = 0)); } });
    if (!tooTall) { const c = current; current = -1; show(Math.max(0, c)); }
    drawArrows();
  }

  let t = null;
  const redraw = () => { clearTimeout(t); t = setTimeout(fit, 120); };
  window.addEventListener("resize", redraw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  show(0);
  fit();
})();