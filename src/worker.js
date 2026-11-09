const ALLOWED_SERVICES = new Set(["starter", "growth", "rescue", "unsure"]);
const ALLOWED_LEAD_STATUSES = new Set(["new", "contacted", "qualified", "closed", "spam"]);
const MAX_REQUEST_BYTES = 12_000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

function methodNotAllowed(allow) {
  return json({ error: "Method not allowed." }, 405, { allow });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function cleanText(value, maxLength = Number.MAX_SAFE_INTEGER) {
  return typeof value === "string" ? value.trim().slice(0, maxLength + 1) : "";
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: json({ error: "Send this request as JSON." }, 415) };
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return { error: json({ error: "Request is too large." }, 413) };
  }

  if (!request.body) return { error: json({ error: "Request body is required." }, 400) };
  try {
    const reader = request.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return { error: json({ error: "Request is too large." }, 413) };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: json({ error: "Invalid request body." }, 400) };
    }
    return { body };
  } catch {
    return { error: json({ error: "Invalid JSON." }, 400) };
  }
}

async function createLead(request, env) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  if (!sameOrigin(request)) return json({ error: "Cross-origin requests are not allowed." }, 403);

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const input = parsed.body;

  // Quietly accept the decoy submission without persisting bot-filled forms.
  if (cleanText(input.website, 200)) return json({ ok: true }, 202);

  const lead = {
    name: cleanText(input.name, 121),
    businessName: cleanText(input.business, 161),
    email: cleanText(input.email, 255).toLowerCase(),
    phone: cleanText(input.phone, 41),
    service: cleanText(input.service, 32),
    message: cleanText(input.message, 4001),
  };

  if (!lead.name || lead.name.length > 120) {
    return json({ error: "Enter a name no longer than 120 characters." }, 400);
  }
  if (!lead.businessName || lead.businessName.length > 160) {
    return json({ error: "Enter a business name no longer than 160 characters." }, 400);
  }
  if (!isValidEmail(lead.email)) return json({ error: "Enter a valid email address." }, 400);
  if (lead.phone.length < 7 || lead.phone.length > 40) {
    return json({ error: "Enter a phone number between 7 and 40 characters." }, 400);
  }
  if (!ALLOWED_SERVICES.has(lead.service)) return json({ error: "Choose a valid service." }, 400);
  if (lead.message.length > 4000) return json({ error: "Your message is too long." }, 400);
  if (input.consent !== "yes" && input.consent !== true) {
    return json({ error: "Please agree to the contact and privacy notice." }, 400);
  }

  const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
  if (env.LEAD_RATE_LIMITER) {
    try {
      const { success } = await env.LEAD_RATE_LIMITER.limit({ key: clientIp });
      if (!success) {
        return json({ error: "Too many requests. Please try again in a minute." }, 429, { "retry-after": "60" });
      }
    } catch {
      // Prefer accepting a legitimate lead if the optional abuse-control binding is unavailable.
      console.error("Lead rate limiter unavailable; continuing without rate limiting.");
    }
  }

  if (!env.DB) return json({ error: "Lead storage is not configured yet." }, 503);
  try {
    const result = await env.DB.prepare(`
      INSERT INTO leads (name, business_name, email, phone, service, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      lead.name,
      lead.businessName,
      lead.email,
      lead.phone,
      lead.service,
      lead.message,
    ).run();

    return json({ ok: true, id: result.meta?.last_row_id ?? null }, 201);
  } catch {
    // Do not write form contents or other personally identifiable information to logs.
    console.error("Unable to save a website inquiry to D1.");
    return json({ error: "We couldn't save your request right now. Please email Devante instead." }, 503);
  }
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a[index] || 0) ^ (b[index] || 0);
  }
  return mismatch === 0;
}

function adminTokenConfigured(env) {
  return typeof env.ADMIN_TOKEN === "string" && env.ADMIN_TOKEN.length >= 32;
}

function isAdmin(request, env) {
  const expected = env.ADMIN_TOKEN;
  const authorization = request.headers.get("authorization") || "";
  if (!adminTokenConfigured(env) || !authorization.startsWith("Bearer ")) return false;
  return constantTimeEqual(authorization.slice(7), expected);
}

async function listLeads(request, env) {
  if (request.method !== "GET") return methodNotAllowed("GET");
  if (!adminTokenConfigured(env)) return json({ error: "Owner access is not configured yet." }, 503);
  if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!env.DB) return json({ error: "Lead storage is not configured." }, 503);

  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "100", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
  try {
    const result = await env.DB.prepare(`
      SELECT id, name, business_name, email, phone, service, message, status,
             consented_at, created_at, updated_at
      FROM leads
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).bind(limit).all();
    return json({ leads: result.results || [] });
  } catch {
    console.error("Unable to read website inquiries from D1.");
    return json({ error: "Unable to load inquiries right now." }, 503);
  }
}

async function updateLead(request, env, leadId) {
  if (!adminTokenConfigured(env)) return json({ error: "Owner access is not configured yet." }, 503);
  if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!env.DB) return json({ error: "Lead storage is not configured." }, 503);

  if (request.method === "PATCH") {
    const parsed = await readJson(request);
    if (parsed.error) return parsed.error;
    const status = cleanText(parsed.body.status, 20);
    if (!ALLOWED_LEAD_STATUSES.has(status)) return json({ error: "Choose a valid lead status." }, 400);

    try {
      const result = await env.DB.prepare(`
        UPDATE leads SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `).bind(status, leadId).run();
      if (!result.meta?.changes) return json({ error: "Inquiry not found." }, 404);
      return json({ ok: true });
    } catch {
      console.error("Unable to update a website inquiry in D1.");
      return json({ error: "Unable to update this inquiry right now." }, 503);
    }
  }

  if (request.method === "DELETE") {
    try {
      const result = await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(leadId).run();
      if (!result.meta?.changes) return json({ error: "Inquiry not found." }, 404);
      return json({ ok: true });
    } catch {
      console.error("Unable to delete a website inquiry from D1.");
      return json({ error: "Unable to delete this inquiry right now." }, 503);
    }
  }

  return methodNotAllowed("PATCH, DELETE");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") return methodNotAllowed("GET");
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, database: "connected" });
      } catch {
        return json({ ok: false, database: "unavailable" }, 503);
      }
    }

    if (url.pathname === "/api/leads") return createLead(request, env);
    if (url.pathname === "/api/admin/leads") return listLeads(request, env);

    const adminLeadMatch = url.pathname.match(/^\/api\/admin\/leads\/(\d+)$/);
    if (adminLeadMatch) return updateLead(request, env, Number(adminLeadMatch[1]));

    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
