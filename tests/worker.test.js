// Worker POST /msg contract, offline: Telegram is a mocked fetch, KV is an in-memory Map.
// Run: npm test (node --test, no dependencies). Nothing here touches the network.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/src/index.js";

const ORIGIN = "https://eyeanton.github.io";
const env = (extra = {}) => ({ ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8000`, TG_TOKEN: "TEST", TG_CHAT_ID: "1", ...extra });
const msg = (body, origin = ORIGIN) => new Request("https://bot.test/msg", {
  method: "POST",
  headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const good = { kind: "question", text: "Привет <b>", contact: "@me", lang: "ru", page: "/x", hp: "", ms: 9000 };

let calls, realFetch, tgStatus;
beforeEach(() => {
  calls = []; tgStatus = 200; realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return new Response("{}", { status: tgStatus }); };
});
afterEach(() => { globalThis.fetch = realFetch; });

test("OPTIONS from an allowed origin → 204 with CORS", async () => {
  const r = await worker.fetch(new Request("https://bot.test/msg", { method: "OPTIONS", headers: { origin: ORIGIN } }), env());
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), ORIGIN);
});

test("unknown path → 404", async () => {
  const r = await worker.fetch(new Request("https://bot.test/nope"), env());
  assert.equal(r.status, 404);
});

test("foreign or missing origin → 403, nothing sent", async () => {
  assert.equal((await worker.fetch(msg(good, "https://evil.test"), env())).status, 403);
  assert.equal((await worker.fetch(msg(good, null), env())).status, 403);
  assert.equal(calls.length, 0);
});

test("bad JSON, non-object body, empty text, unknown kind → 400", async () => {
  for (const body of ["{", "null", "42", { ...good, text: "  " }, { ...good, kind: "spam" }, { ...good, kind: "constructor" }, { ...good, kind: "__proto__" }]) {
    const r = await worker.fetch(msg(body), env());
    assert.equal(r.status, 400, JSON.stringify(body));
  }
  assert.equal(calls.length, 0);
});

test("honeypot or a too-fast answer: pretend ok, send nothing", async () => {
  assert.deepEqual(await (await worker.fetch(msg({ ...good, hp: "x" }), env())).json(), { ok: true });
  assert.deepEqual(await (await worker.fetch(msg({ ...good, ms: 500 }), env())).json(), { ok: true });
  assert.equal(calls.length, 0);
});

test("valid message → one Telegram sendMessage, HTML escaped, page tagged with origin", async () => {
  const r = await worker.fetch(msg(good), env());
  assert.equal(r.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/botTEST\/sendMessage$/);
  assert.equal(calls[0].body.chat_id, "1");
  assert.equal(calls[0].body.parse_mode, "HTML");
  assert.match(calls[0].body.text, /Привет &lt;b&gt;/);
  assert.match(calls[0].body.text, /eyeanton\.github\.io\/x/);
});

test("Telegram error → 502", async () => {
  tgStatus = 400;
  const orig = console.error; console.error = () => {};
  try { assert.equal((await worker.fetch(msg(good), env())).status, 502); } finally { console.error = orig; }
});

test("per-IP limit (KV RL) → 429 after PER_IP_HOUR", async () => {
  const store = new Map();
  const RL = { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } };
  const e = env({ RL, PER_IP_HOUR: "2" });
  const withIp = () => { const r = msg(good); r.headers.set("cf-connecting-ip", "203.0.113.7"); return r; };
  assert.equal((await worker.fetch(withIp(), e)).status, 200);
  assert.equal((await worker.fetch(withIp(), e)).status, 200);
  assert.equal((await worker.fetch(withIp(), e)).status, 429);
  assert.equal(calls.length, 2);
});
