/*
  Chart helpers for the survey: donut / two-ring donut, Sankey, small-multiple bars.
  Plain SVG + HTML, no libraries. All charts show illustrative figures supplied by survey.js.
*/
(function () {
  "use strict";

  // Categorical palette (fixed order, never cycled). Validated for colour-vision deficiency.
  const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
  const OTHER = "#8a8a90";            // reserved for "Other …" buckets
  const SVGNS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }
  function h(tag, attrs, children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "text") n.textContent = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => c && n.appendChild(c));
    return n;
  }
  // Stable pseudo-random number in [0,1) for a string.
  function unit(str) {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995); x ^= x >>> 15;
    return ((x >>> 0) % 100000) / 100000;
  }
  const pct = (v, d) => (v * 100).toFixed(d == null ? 1 : d) + "%";

  // ---------- shared tooltip ----------
  function makeTip(host) {
    host.style.position = "relative";
    const tip = h("div", { class: "ctip", role: "status", "aria-live": "polite" });
    tip.hidden = true;
    host.appendChild(tip);
    return {
      show(lines, x, y) {
        tip.innerHTML = "";
        lines.forEach((l, i) => tip.appendChild(h(i === 0 ? "b" : "span", { class: i === 2 ? "tc" : null, text: l })));
        tip.hidden = false;
        const hw = host.clientWidth, tw = tip.offsetWidth;
        tip.style.left = Math.max(4, Math.min(x + 14, hw - tw - 4)) + "px";
        tip.style.top = (y + 14) + "px";
      },
      hide() { tip.hidden = true; }
    };
  }

  // ---------- donut (one ring) or two-ring donut ----------
  // opts: { groups:[{name,color,items:[{name,value}]}], nested:boolean, center:{big,small}, label }
  //  nested=false: one ring of items coloured by group.
  //  nested=true : inner ring = groups' items (e.g. GWAs), outer ring = each item's children.
  //                items then carry children:[{name,value}] and value = sum of children.
  function donut(opts) {
    const size = 340, cx = 170, cy = 170, R = 150, rIn = opts.nested ? 96 : 92;
    const wrap = h("div", { class: "donut-wrap" });
    const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: "img",
      "aria-label": opts.label + ". Use the left and right arrow keys to read each segment.", tabindex: "0", class: "donut" });
    const total = opts.groups.reduce((s, g) => s + g.items.reduce((a, i) => a + i.value, 0), 0) || 1;
    const segs = [];
    const arc = (a0, a1, ri, ro) => {
      const p = (a, rr) => [cx + rr * Math.sin(a), cy - rr * Math.cos(a)];
      const lg = a1 - a0 > Math.PI ? 1 : 0;
      const [x0, y0] = p(a0, ro), [x1, y1] = p(a1, ro), [x2, y2] = p(a1, ri), [x3, y3] = p(a0, ri);
      return `M${x0},${y0} A${ro},${ro} 0 ${lg} 1 ${x1},${y1} L${x2},${y2} A${ri},${ri} 0 ${lg} 0 ${x3},${y3} Z`;
    };
    let a = 0;
    opts.groups.forEach(g => g.items.forEach(item => {
      const span = item.value / total * Math.PI * 2;
      if (!opts.nested) {
        segs.push({ d: arc(a, a + span, rIn, R), fill: g.color, a0: a, a1: a + span, r: (rIn + R) / 2,
          lines: [pct(item.value / total), item.name, g.name], sw: 1.5 });
      } else {
        const p = svgEl("path", { d: arc(a, a + span, rIn - 34, rIn - 4), fill: g.color, "fill-opacity": "0.5", stroke: "#fff", "stroke-width": "1" });
        p.appendChild(svgEl("title")).textContent = `${item.name} (GWA): ${pct(item.value / total)}`;
        svg.appendChild(p);
        let b = a;
        (item.children || []).forEach(ch => {
          const sp = ch.value / total * Math.PI * 2;
          segs.push({ d: arc(b, b + sp, rIn, R), fill: g.color, a0: b, a1: b + sp, r: (rIn + R) / 2,
            lines: [pct(ch.value / total), ch.name, item.name], sw: 0.6 });
          b += sp;
        });
      }
      a += span;
    }));
    segs.forEach((s, i) => {
      s.el = svgEl("path", { d: s.d, fill: s.fill, stroke: "#fff", "stroke-width": s.sw, class: "seg" });
      s.el.addEventListener("mouseenter", e => activate(i, e));
      s.el.addEventListener("mousemove", e => place(i, e));
      s.el.addEventListener("mouseleave", () => deactivate());
      s.el.addEventListener("click", e => activate(i, e));
      svg.appendChild(s.el);
    });
    const big = svgEl("text", { x: cx, y: cy - 2, "text-anchor": "middle", class: "donut-big" });
    big.textContent = opts.center.big;
    const small = svgEl("text", { x: cx, y: cy + 20, "text-anchor": "middle", class: "donut-small" });
    small.textContent = opts.center.small;
    svg.appendChild(big); svg.appendChild(small);
    wrap.appendChild(svg);
    const tip = makeTip(wrap);
    let cur = -1;
    function centroid(i) {
      const s = segs[i], m = (s.a0 + s.a1) / 2, rect = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      const k = rect.width / size;
      return [rect.left - wr.left + (cx + s.r * Math.sin(m)) * k, rect.top - wr.top + (cy - s.r * Math.cos(m)) * k];
    }
    function activate(i, e) {
      if (cur >= 0) segs[cur].el.classList.remove("hot");
      cur = i; segs[i].el.classList.add("hot");
      place(i, e);
    }
    function place(i, e) {
      let x, y;
      if (e && e.clientX != null && e.type !== "click") { const r = wrap.getBoundingClientRect(); x = e.clientX - r.left; y = e.clientY - r.top; }
      else [x, y] = centroid(i);
      tip.show(segs[i].lines, x, y);
    }
    function deactivate() { if (cur >= 0) segs[cur].el.classList.remove("hot"); cur = -1; tip.hide(); }
    svg.addEventListener("keydown", e => {
      if (!["ArrowRight", "ArrowLeft", "Escape"].includes(e.key)) return;
      e.preventDefault();
      if (e.key === "Escape") return deactivate();
      const n = segs.length;
      activate(cur < 0 ? 0 : (cur + (e.key === "ArrowRight" ? 1 : -1) + n) % n);
    });
    svg.addEventListener("blur", deactivate);
    document.addEventListener("click", e => { if (!wrap.contains(e.target)) deactivate(); });
    return wrap;
  }

  // ---------- Sankey ----------
  // opts: { columns:[{name, cats:[...]}], paths:[{k:[i0,i1,...], v}], colors:[per cat of column 0], highlight:[i0,i1,...], label }
  function sankey(opts) {
    const cols = opts.columns, paths = opts.paths;
    const W = 1160, H = 440, nodeW = 14, pad = 14, top = 30, labelRoom = 200;
    const total = paths.reduce((s, p) => s + p.v, 0) || 1;
    const xs = cols.map((_, c) => cols.length === 1 ? 0 : c * (W - labelRoom - nodeW) / (cols.length - 1));
    const maxN = Math.max(...cols.map(c => c.cats.length));
    const k = (H - top - pad * (maxN - 1)) / total;
    const nodes = cols.map((col, c) => {
      let y = top;
      return col.cats.map((name, i) => {
        const v = paths.filter(p => p.k[c] === i).reduce((s, p) => s + p.v, 0);
        const n = { c, i, name, v, x: xs[c], y, h: v * k, outY: y, inY: y };
        y += v * k + pad; return n;
      });
    });
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H + 8}`, role: "img", "aria-label": opts.label, class: "sankey" });
    cols.forEach((col, c) => {
      const t = svgEl("text", { x: xs[c], y: 14, class: "sk-head" });
      t.textContent = `${c + 1}. ${col.name}`;
      svg.appendChild(t);
    });
    const wrapEl = h("div", { class: "sankey-scroll" });
    const tipHost = h("div", { class: "sankey-host" });
    const tip = makeTip(tipHost);
    const hl = opts.highlight || [];
    for (let c = 0; c < cols.length - 1; c++) {
      const agg = {};
      paths.forEach(p => { const key = `${p.k[0]}|${p.k[c]}|${p.k[c + 1]}`; agg[key] = (agg[key] || 0) + p.v; });
      const links = Object.entries(agg).map(([key, v]) => { const [u, s, t] = key.split("|").map(Number); return { u, s, t, v }; });
      links.sort((A, B) => A.s - B.s || A.t - B.t || A.u - B.u).forEach(L => { L.sy = nodes[c][L.s].outY; nodes[c][L.s].outY += L.v * k; });
      links.slice().sort((A, B) => A.t - B.t || A.s - B.s || A.u - B.u).forEach(L => { L.ty = nodes[c + 1][L.t].inY; nodes[c + 1][L.t].inY += L.v * k; });
      links.forEach(L => {
        const w = Math.max(L.v * k, 0.6), x0 = xs[c] + nodeW, x1 = xs[c + 1], xm = (x0 + x1) / 2;
        const y0 = L.sy + w / 2, y1 = L.ty + w / 2;
        const on = hl.length && L.u === hl[0] && L.s === hl[c] && L.t === hl[c + 1];
        const p = svgEl("path", { d: `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1}`, fill: "none",
          stroke: opts.colors[L.u], "stroke-width": w, "stroke-opacity": on ? 0.85 : 0.24, class: "band" });
        const lines = [pct(L.v / total), `${cols[c].cats[L.s]} → ${cols[c + 1].cats[L.t]}`, `${cols[0].name}: ${cols[0].cats[L.u]}`];
        p.addEventListener("mousemove", e => { const r = tipHost.getBoundingClientRect(); p.classList.add("hot"); tip.show(lines, e.clientX - r.left, e.clientY - r.top); });
        p.addEventListener("mouseleave", () => { p.classList.remove("hot"); tip.hide(); });
        svg.appendChild(p);
      });
    }
    nodes.forEach((col, c) => col.forEach(n => {
      svg.appendChild(svgEl("rect", { x: n.x, y: n.y, width: nodeW, height: Math.max(n.h, 1), rx: 2,
        fill: c === 0 ? opts.colors[n.i] : "#4D4D52" }));
      const t = svgEl("text", { x: n.x + nodeW + 8, y: n.y + n.h / 2 + 4, class: "sk-label" });
      const b = svgEl("tspan", { "font-weight": "700" }); b.textContent = pct(n.v / total, 0);
      t.appendChild(b); t.appendChild(document.createTextNode(" " + n.name));
      svg.appendChild(t);
    }));
    wrapEl.appendChild(svg);
    tipHost.appendChild(wrapEl);
    return tipHost;
  }

  // ---------- small multiples: same rows, one bar panel per column ----------
  // opts: { rows:[label], panels:[{name, values:[0..1 per row]}] }
  function smallMultiples(opts) {
    const max = Math.max(...opts.panels.flatMap(p => p.values)) || 1;
    const grid = h("div", { class: "sm", style: `grid-template-columns:minmax(120px,1.3fr) repeat(${opts.panels.length},minmax(0,1fr))`, role: "table", "aria-label": opts.label });
    grid.appendChild(h("div", { class: "sm-hd sm-lab", role: "columnheader" }));
    opts.panels.forEach(p => grid.appendChild(h("div", { class: "sm-hd", role: "columnheader", text: p.name })));
    opts.rows.forEach((r, i) => {
      grid.appendChild(h("div", { class: "sm-lab", role: "rowheader", text: r }));
      opts.panels.forEach(p => {
        const v = p.values[i];
        grid.appendChild(h("div", { class: "sm-cell", role: "cell", title: `${p.name}, ${r}: ${pct(v, 0)}` }, [
          h("div", { class: "sm-bar", style: `width:${(v / max) * 72}%` }),
          h("span", { class: "sm-v", text: pct(v, 0) })
        ]));
      });
    });
    return grid;
  }

  window.SurveyCharts = { PALETTE, OTHER, unit, pct, donut, sankey, smallMultiples };
})();