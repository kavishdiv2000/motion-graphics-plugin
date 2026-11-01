// Token-usage ledger: logs the LLM tokens each video session consumed into
//   .motion-graphics/sessions/<id>/usage.json        totals (by model, by client, by chat)
//   .motion-graphics/sessions/<id>/usage.log.jsonl   one line per recorded turn
//   .motion-graphics/usage/workspace.log.jsonl       motion-graphics work not tied to one video (e.g. DESIGN.md setup)
//
// Sources (the agent itself cannot count its tokens; the host app can):
//   claude-code  Stop/SessionEnd hook → reads the chat transcript (assistant message.usage, de-duplicated by message id,
//                incl. subagent transcripts)                                                   → exact
//   codex        Stop hook → reads the rollout file (event_msg/token_count, cumulative totals → per-turn deltas) → exact
//   cursor       afterAgentResponse hook → token fields in the payload                         → best effort
//   manual       `mg usage add` (Copilot, chat UIs, anything else)
//
// Attribution: the transcript is replayed in order; a line that mentions exactly one existing session id makes it the
// "current" session; each model call's usage goes to the current session. Calls before any mention go to the session
// this chat worked on last, else (if the turn touched motion-graphics at all) to the workspace bucket, else nowhere.
// Zero third-party imports: this file is also run straight from the plugin by the Claude Code hook.
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const FIELDS = ['input', 'cache_write', 'cache_read', 'output', 'reasoning', 'requests'];
const ZERO = () => Object.fromEntries(FIELDS.map((f) => [f, 0]));
export const totalOf = (u) => (u.input || 0) + (u.cache_write || 0) + (u.cache_read || 0) + (u.output || 0);
const addInto = (a, b) => { for (const f of FIELDS) a[f] = (a[f] || 0) + (b[f] || 0); return a; };
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// ───────────────────────────────────────────── workspace helpers (no dependency on workspace.mjs: hook runs standalone)
export function findMgDir(start) {
  let d = resolve(start || process.cwd());
  for (;;) {
    if (existsSync(join(d, '.motion-graphics', 'config.json'))) return join(d, '.motion-graphics');
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}
const sessionsDir = (mg) => join(mg, 'sessions');
export function sessionIds(mg) {
  const d = sessionsDir(mg);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((x) => !x.startsWith('.') && existsSync(join(d, x, 'session.json')));
}
const stateDir = (mg) => join(mg, '.state', 'usage');
const safe = (s) => String(s || 'unknown').replace(/[^\w.-]+/g, '_').slice(0, 120);
function readJson(f, dflt) { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return dflt; } }
function writeJson(f, v) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); }

/** Called by the mg CLI whenever a command resolves a session — fallback attribution for clients without transcripts. */
export function touchSession(mg, id) {
  try { writeJson(join(mg, '.state', 'last-session.json'), { id, at: new Date().toISOString() }); } catch {}
}

/** mentions(text) → Set of session ids mentioned in text (whole-id matches only, so "x-b" doesn't also match "x"). */
export function makeMatcher(ids) {
  if (!ids.length) return () => new Set();
  const alt = [...ids].sort((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(?<![\\w-])(${alt})(?![\\w-])`, 'g');
  return (text) => new Set([...String(text).matchAll(re)].map((m) => m[1]));
}

// ───────────────────────────────────────────── incremental file reading
/** New complete lines of a file since state.offsets[file] (bytes for plain files, lines for .zst). */
function readNewLines(file, st) {
  st.offsets ||= {};
  if (!file || !existsSync(file)) return [];
  if (file.endsWith('.zst')) {
    const r = spawnSync('zstd', ['-dc', file], { encoding: 'utf8', maxBuffer: 1 << 30 });
    if (r.status !== 0) throw new Error(`cannot read ${basename(file)}: install zstd to decompress Codex rollouts`);
    const lines = r.stdout.split('\n').filter(Boolean);
    const from = st.offsets[file] || 0;
    st.offsets[file] = lines.length;
    return lines.slice(from);
  }
  const size = statSync(file).size;
  let from = st.offsets[file] || 0;
  if (from > size) from = 0; // file was rewritten
  if (from === size) return [];
  const buf = Buffer.alloc(size - from);
  const fd = openSync(file, 'r');
  try { readSync(fd, buf, 0, buf.length, from); } finally { closeSync(fd); }
  const end = buf.lastIndexOf(0x0a);
  if (end < 0) return [];
  st.offsets[file] = from + end + 1;
  return buf.subarray(0, end).toString('utf8').split('\n').filter(Boolean);
}

// ───────────────────────────────────────────── adapters → ordered events: { text } | { text, usage, model }
/** Claude Code transcript JSONL: assistant lines carry message.usage; one message is split over several lines (one per
 *  content block) that all repeat the same usage → group by message.id, count once. Subagents live next to the transcript. */
export function claudeEvents(transcriptPath, st) {
  const files = [transcriptPath];
  const subDir = join(dirname(transcriptPath), basename(transcriptPath, '.jsonl'), 'subagents');
  if (existsSync(subDir)) for (const f of readdirSync(subDir).sort()) if (f.endsWith('.jsonl')) files.push(join(subDir, f));
  const seen = new Set(st.seen || []);
  const events = [];
  for (const f of files) {
    const groups = new Map();
    for (const line of readNewLines(f, st)) {
      let j; try { j = JSON.parse(line); } catch { continue; }
      const m = j.message;
      if (j.type === 'assistant' && m?.id && m.usage) {
        let g = groups.get(m.id);
        if (!g) { g = { text: '', usage: null, model: m.model }; groups.set(m.id, g); events.push(g); g.id = m.id; }
        g.text += line;
        const u = m.usage;
        const nu = { input: num(u.input_tokens), cache_write: num(u.cache_creation_input_tokens), cache_read: num(u.cache_read_input_tokens), output: num(u.output_tokens), reasoning: num(u.output_tokens_details?.thinking_tokens), requests: 1 };
        if (!g.usage || nu.output >= g.usage.output) g.usage = nu; // last/largest snapshot wins
      } else events.push({ text: line });
    }
  }
  for (const e of events) if (e.id) { if (seen.has(e.id) || e.model === '<synthetic>') e.usage = null; seen.add(e.id); }
  st.seen = [...seen].slice(-2000);
  return events;
}

/** Codex rollout JSONL: event_msg/token_count carries CUMULATIVE totals (info.total_token_usage, or flat on payload);
 *  per-turn usage = delta. OpenAI counts cached tokens inside input_tokens, so input = input − cached. */
export function codexEvents(rolloutPath, st, hookModel) {
  const events = [];
  let model = st.model || hookModel || null;
  for (const line of readNewLines(rolloutPath, st)) {
    let j; try { j = JSON.parse(line); } catch { continue; }
    const pl = j.payload || {};
    if (j.type === 'turn_context' && pl.model) { model = pl.model; continue; }
    if (pl.type === 'token_count' || j.type === 'token_count') {
      if (pl.turn_context?.model) model = pl.turn_context.model;
      const t = pl.info?.total_token_usage || (pl.input_tokens !== undefined ? pl : null);
      if (!t) continue;
      const cur = { in: num(t.input_tokens), cached: num(t.cached_input_tokens), out: num(t.output_tokens), reas: num(t.reasoning_output_tokens ?? t.reasoning_tokens) };
      const prev = st.prevTotal || { in: 0, cached: 0, out: 0, reas: 0 };
      if (cur.in < prev.in || cur.out < prev.out) Object.assign(prev, { in: 0, cached: 0, out: 0, reas: 0 }); // counter reset
      const d = { in: cur.in - prev.in, cached: cur.cached - prev.cached, out: cur.out - prev.out, reas: cur.reas - prev.reas };
      st.prevTotal = cur;
      if (d.in <= 0 && d.out <= 0) continue; // repeated snapshot (rate-limit refresh)
      events.push({ text: '', model, usage: { input: Math.max(0, d.in - d.cached), cache_write: 0, cache_read: Math.max(0, d.cached), output: d.out, reasoning: Math.max(0, d.reas), requests: 1 } });
    } else events.push({ text: line });
  }
  st.model = model;
  return events;
}

/** Cursor afterAgentResponse payload: field names aren't documented, so collect any token-ish numbers anywhere in it. */
export function cursorEvents(payload, st) {
  const u = ZERO();
  let found = false;
  const walk = (o, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 6) return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'number') {
        const key = k.toLowerCase();
        if (!/token/.test(key)) continue;
        found = true;
        if (/cache.?(read|hit)/.test(key)) u.cache_read += v;
        else if (/cache.?(write|creat)/.test(key)) u.cache_write += v;
        else if (/reason|think/.test(key)) u.reasoning += v;
        else if (/^(input|prompt)/.test(key) || /(input|prompt).?tokens/.test(key)) u.input += v;
        else if (/^(output|completion)/.test(key) || /(output|completion).?tokens/.test(key)) u.output += v;
      } else walk(v, depth + 1);
    }
  };
  walk(payload);
  const events = [];
  if (payload.transcript_path) { try { for (const l of readNewLines(payload.transcript_path, st)) events.push({ text: l }); } catch {} }
  events.push({ text: JSON.stringify(payload), model: payload.model || payload.model_id || null, usage: found && totalOf(u) > 0 ? { ...u, requests: 1 } : null });
  return events;
}

// ───────────────────────────────────────────── attribution + ledger
export function attribute(events, mentions, st, fallbackSession) {
  const buckets = new Map(); // session id | '' (workspace) → Map(model → usage)
  const put = (key, model, u) => {
    if (!buckets.has(key)) buckets.set(key, new Map());
    const m = buckets.get(key);
    addInto(m.get(model || 'unknown') || m.set(model || 'unknown', ZERO()).get(model || 'unknown'), u);
  };
  let current = st.session || null;
  let relevant = !!current;
  const pending = [];
  for (const e of events) {
    if (e.text) {
      const hit = mentions(e.text);
      if (hit.size === 1) {
        current = [...hit][0];
        relevant = true;
        for (const p of pending.splice(0)) put(current, p.model, p.usage);
      } else if (!relevant && /\.motion-graphics|motion-graphics:|skills[\\/]+motion-graphics/.test(e.text)) relevant = true;
    }
    if (e.usage) { if (current) put(current, e.model, e.usage); else pending.push(e); }
  }
  if (pending.length) {
    const target = fallbackSession || (relevant ? '' : null);
    if (target !== null) { for (const p of pending) put(target, p.model, p.usage); if (fallbackSession) current = fallbackSession; }
  }
  st.session = current;
  return buckets;
}

function ledgerPaths(mg, key) {
  if (key) return { log: join(sessionsDir(mg), key, 'usage.log.jsonl'), summary: join(sessionsDir(mg), key, 'usage.json') };
  return { log: join(mg, 'usage', 'workspace.log.jsonl'), summary: join(mg, 'usage', 'workspace.json') };
}

export function readLog(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

/** Recompute the summary from the log (the log is the source of truth). */
export function summarise(mg, key) {
  const { log, summary } = ledgerPaths(mg, key);
  const rows = readLog(log);
  const totals = ZERO(); const byModel = {}; const byClient = {}; const chats = new Set();
  for (const r of rows) {
    addInto(totals, r);
    addInto(byModel[r.model || 'unknown'] ||= ZERO(), r);
    addInto(byClient[r.client || 'unknown'] ||= ZERO(), r);
    if (r.chat) chats.add(`${r.client}:${r.chat}`);
  }
  const withTotal = (u) => ({ ...u, total: totalOf(u) });
  const out = {
    schema: 'motion-graphics-usage/1.0', session: key || null, updated: new Date().toISOString(),
    totals: withTotal(totals),
    by_model: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, withTotal(v)])),
    by_client: Object.fromEntries(Object.entries(byClient).map(([k, v]) => [k, withTotal(v)])),
    chats: [...chats], turns: new Set(rows.map((r) => r.run || r.at)).size,
    first: rows[0]?.at || null, last: rows.at(-1)?.at || null,
    note: 'input = uncached input tokens; cache_write/cache_read = prompt-cache tokens; output includes reasoning; total = input + cache_write + cache_read + output. Counts every model call the agent made while working on this video (incl. subagents), not only the plugin\'s own text.',
  };
  writeJson(summary, out);
  return out;
}

export function record(mg, key, row) {
  const { log } = ledgerPaths(mg, key);
  mkdirSync(dirname(log), { recursive: true });
  appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), ...row, total: totalOf(row) }) + '\n');
  return summarise(mg, key);
}

/** Entry point for all hooks. Never throws, never prints (hook stdout can be interpreted by the host). */
export function runHook(client, input) {
  let mg = null;
  try {
    mg = findMgDir(input.cwd || input.workspace_roots?.[0] || process.cwd());
    if (!mg) return { skipped: 'no .motion-graphics in this workspace' };
    const chat = input.session_id || input.conversation_id || input.thread_id || 'unknown';
    const stFile = join(stateDir(mg), `${safe(client)}-${safe(chat)}.json`);
    const st = readJson(stFile, {});
    let events;
    if (client === 'claude-code') events = input.transcript_path ? claudeEvents(input.transcript_path, st) : [];
    else if (client === 'codex') events = input.transcript_path ? codexEvents(input.transcript_path, st, input.model) : [];
    else if (client === 'cursor') events = cursorEvents(input, st);
    else throw new Error(`unknown client ${client}`);
    const ids = sessionIds(mg);
    let fallback = null;
    if (client === 'cursor' && !st.session) { // no tool-call transcript: use the session the CLI touched in the last 30 min
      const last = readJson(join(mg, '.state', 'last-session.json'), null);
      if (last && ids.includes(last.id) && Date.now() - Date.parse(last.at) < 30 * 60e3) fallback = last.id;
    }
    if (st.session && !ids.includes(st.session)) st.session = null; // session deleted
    const buckets = attribute(events, makeMatcher(ids), st, fallback);
    const written = [];
    const run = new Date().toISOString();
    for (const [key, models] of buckets) for (const [model, u] of models) {
      if (!totalOf(u)) continue;
      record(mg, key, { run, client, chat, model, ...u, source: client === 'cursor' ? 'hook (best effort)' : 'transcript' });
      written.push(key || 'workspace');
    }
    st.updated = new Date().toISOString();
    writeJson(stFile, st);
    return { recorded: written };
  } catch (e) {
    try { if (mg) { mkdirSync(join(mg, '.state'), { recursive: true }); appendFileSync(join(mg, '.state', 'usage-errors.log'), `${new Date().toISOString()} ${client}: ${e.stack || e}\n`); } } catch {}
    return { error: String(e.message || e) };
  }
}

export function readStdinJson() {
  try { const s = readFileSync(0, 'utf8'); return s.trim() ? JSON.parse(s) : {}; } catch { return {}; }
}

// ───────────────────────────────────────────── reporting
export const fmtN = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n || 0));
export function usageTable(rows) {
  const out = ['| session | turns | input | cache write | cache read | output | total | models |', '|---|--:|--:|--:|--:|--:|--:|---|'];
  for (const [name, s] of rows) {
    const t = s.totals;
    out.push(`| ${name} | ${s.turns} | ${fmtN(t.input)} | ${fmtN(t.cache_write)} | ${fmtN(t.cache_read)} | ${fmtN(t.output)} | **${fmtN(t.total)}** | ${Object.keys(s.by_model).join(', ')} |`);
  }
  return out.join('\n');
}
