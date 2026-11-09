import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const ADMIN_TOKEN = "test-only-token-that-is-at-least-thirty-two-characters";
const validLead = {
  name: "Taylor Example",
  business: "Example Plumbing",
  email: "taylor@example.com",
  phone: "602-555-0188",
  service: "growth",
  message: "I need a new website for my company.",
  consent: "yes",
  website: "",
};

function mockDatabase() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, args: [] };
      calls.push(call);
      return {
        bind(...args) {
          call.args = args;
          return this;
        },
        async run() {
          if (sql.trim().startsWith("INSERT")) return { meta: { last_row_id: 42, changes: 1 } };
          return { meta: { changes: 1 } };
        },
        async all() {
          return {
            results: [{ id: 42, name: "Taylor Example", business_name: "Example Plumbing", status: "new" }],
          };
        },
        async first() {
          return { ok: 1 };
        },
      };
    },
  };
}

function createRequest(path, options = {}) {
  return new Request(`https://southwest.test${path}`, options);
}

async function read(response) {
  return { response, body: await response.json() };
}

test("health endpoint confirms the database binding responds", async () => {
  const DB = mockDatabase();
  const { response, body } = await read(await worker.fetch(createRequest("/api/health"), { DB }));
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, database: "connected" });
});

test("valid quote requests are validated, rate limited, and stored", async () => {
  const DB = mockDatabase();
  let rateLimitCalls = 0;
  const response = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://southwest.test", "cf-connecting-ip": "192.0.2.1" },
    body: JSON.stringify(validLead),
  }), {
    DB,
    LEAD_RATE_LIMITER: { async limit({ key }) { rateLimitCalls += 1; assert.equal(key, "192.0.2.1"); return { success: true }; } },
  });
  const { body } = await read(response);
  assert.equal(response.status, 201);
  assert.deepEqual(body, { ok: true, id: 42 });
  assert.equal(rateLimitCalls, 1);
  assert.match(DB.calls[0].sql, /INSERT INTO leads/);
  assert.deepEqual(DB.calls[0].args.slice(0, 5), [
    "Taylor Example", "Example Plumbing", "taylor@example.com", "602-555-0188", "growth",
  ]);
});

test("honeypot submissions are acknowledged but never stored", async () => {
  const DB = mockDatabase();
  const payload = { ...validLead, website: "bot-filled-this" };
  const response = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }), { DB });
  assert.equal(response.status, 202);
  assert.equal(DB.calls.length, 0);
});

test("invalid and oversized requests are rejected before touching the database", async () => {
  const DB = mockDatabase();
  const invalid = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validLead, email: "not-an-email" }),
  }), { DB });
  assert.equal(invalid.status, 400);

  const oversized = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validLead, message: "x".repeat(13_000) }),
  }), { DB });
  assert.equal(oversized.status, 413);
  assert.equal(DB.calls.length, 0);
});

test("missing consent and cross-origin requests are rejected", async () => {
  const DB = mockDatabase();
  const noConsent = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validLead, consent: "" }),
  }), { DB });
  assert.equal(noConsent.status, 400);

  const crossOrigin = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify(validLead),
  }), { DB });
  assert.equal(crossOrigin.status, 403);
  assert.equal(DB.calls.length, 0);
});

test("rate-limited quote requests receive a retry response and are not stored", async () => {
  const DB = mockDatabase();
  const response = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validLead),
  }), { DB, LEAD_RATE_LIMITER: { async limit() { return { success: false }; } } });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(DB.calls.length, 0);
});

test("a rate-limit binding failure does not discard a valid inquiry", async () => {
  const DB = mockDatabase();
  const response = await worker.fetch(createRequest("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validLead),
  }), { DB, LEAD_RATE_LIMITER: { async limit() { throw new Error("Unavailable"); } } });
  assert.equal(response.status, 201);
  assert.equal(DB.calls.length, 1);
});

test("admin lead listing requires the secret token", async () => {
  const DB = mockDatabase();
  const noToken = await worker.fetch(createRequest("/api/admin/leads"), { DB, ADMIN_TOKEN });
  assert.equal(noToken.status, 401);

  const response = await worker.fetch(createRequest("/api/admin/leads?limit=10", {
    headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
  }), { DB, ADMIN_TOKEN });
  const { body } = await read(response);
  assert.equal(response.status, 200);
  assert.equal(body.leads.length, 1);
  assert.match(DB.calls[0].sql, /ORDER BY created_at DESC/);
  assert.deepEqual(DB.calls[0].args, [10]);
});

test("admin can update and delete a lead using authenticated requests", async () => {
  const DB = mockDatabase();
  const update = await worker.fetch(createRequest("/api/admin/leads/42", {
    method: "PATCH",
    headers: { authorization: `Bearer ${ADMIN_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ status: "contacted" }),
  }), { DB, ADMIN_TOKEN });
  assert.equal(update.status, 200);
  assert.deepEqual(DB.calls[0].args, ["contacted", 42]);

  const remove = await worker.fetch(createRequest("/api/admin/leads/42", {
    method: "DELETE",
    headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
  }), { DB, ADMIN_TOKEN });
  assert.equal(remove.status, 200);
  assert.deepEqual(DB.calls[1].args, [42]);
});
