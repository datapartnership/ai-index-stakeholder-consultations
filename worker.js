/*
  Survey Worker (Cloudflare) – stores responses in a D1 database
  ==============================================================
  POST /                     Survey page sends a response here (anyone can submit).
  GET  /export?key=SECRET    Downloads every response as one CSV file (only with the key).

  Setup (Worker → Settings):
    Bindings:              D1 database, variable name  DB
    Variables and Secrets:
      ALLOWED_ORIGIN  Text    https://datapartnership.github.io
      EXPORT_KEY      Secret  a long random string; protects the CSV download link

  The table is created automatically on first use. New survey questions need no
  database changes: answers are stored as JSON and become CSV columns automatically.

  Privacy: stores only the survey answers plus a server timestamp.
  No IP addresses, user agents or other visitor details are recorded.
*/

const MAX_BODY_BYTES = 20000;   // whole request
const MAX_FIELDS = 120;         // number of answers
const MAX_VALUE_LENGTH = 5000;  // characters per answer
const KEY_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

let tableReady = false;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!env.DB) return text(500, "Worker is not configured: add a D1 binding named DB.");
    await ensureTable(env.DB);

    if (url.pathname === "/export") {
      if (request.method !== "GET") return text(405, "Method not allowed");
      return exportCsv(url, env);
    }
    return handleSubmit(request, env);
  }
};

// ---------- submissions ----------
async function handleSubmit(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "").replace(/\/$/, "");
  const cors = {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  const reply = (status, obj) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply(405, { ok: false, error: "Method not allowed" });
  if (!allowed || origin !== allowed) return reply(403, { ok: false, error: "Origin not allowed" });

  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return reply(413, { ok: false, error: "Submission too large" });

  let data;
  try { data = JSON.parse(body); } catch { return reply(400, { ok: false, error: "Invalid JSON" }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return reply(400, { ok: false, error: "Expected a JSON object" });

  const keys = Object.keys(data);
  if (keys.length === 0 || keys.length > MAX_FIELDS) return reply(400, { ok: false, error: "Wrong number of fields" });
  const clean = {};
  for (const k of keys) {
    if (!KEY_PATTERN.test(k)) return reply(400, { ok: false, error: "Invalid field name" });
    const v = data[k];
    if (v !== null && !["string", "number", "boolean"].includes(typeof v)) return reply(400, { ok: false, error: "Invalid field value" });
    if (typeof v === "string" && v.length > MAX_VALUE_LENGTH) return reply(400, { ok: false, error: "Answer too long" });
    clean[k] = v;
  }

  // Server-side id and timestamp; the visitor's own id/timestamp are kept as answers.
  const id = crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  delete clean.responseId;

  try {
    await env.DB
      .prepare("INSERT INTO responses (id, received_at, data) VALUES (?, ?, ?)")
      .bind(id, receivedAt, JSON.stringify(clean))
      .run();
  } catch (err) {
    console.error("D1 insert failed", err);
    return reply(502, { ok: false, error: "Could not save response" });
  }
  return reply(200, { ok: true });
}

// ---------- CSV export ----------
async function exportCsv(url, env) {
  const given = url.searchParams.get("key") || "";
  if (!env.EXPORT_KEY || !safeEqual(given, env.EXPORT_KEY)) return text(401, "Unauthorized");

  const { results } = await env.DB
    .prepare("SELECT id, received_at, data FROM responses ORDER BY received_at")
    .all();

  // Columns: fixed ones first, then every answer field in the order first seen.
  const columns = ["responseId", "receivedAt"];
  const rows = (results || []).map(r => {
    let answers = {};
    try { answers = JSON.parse(r.data) || {}; } catch {}
    for (const k of Object.keys(answers)) if (!columns.includes(k)) columns.push(k);
    return { responseId: r.id, receivedAt: r.received_at, ...answers };
  });

  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) lines.push(columns.map(c => csvCell(row[c])).join(","));

  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="survey-responses.csv"',
      "Cache-Control": "no-store"
    }
  });
}

// ---------- helpers ----------
async function ensureTable(db) {
  if (tableReady) return;
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS responses (id TEXT PRIMARY KEY, received_at TEXT NOT NULL, data TEXT NOT NULL)"
  ).run();
  tableReady = true;
}

function csvCell(v) {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Stop public answers being run as spreadsheet formulas (e.g. "=HYPERLINK(...)").
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function safeEqual(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function text(status, msg) {
  return new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}