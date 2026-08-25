import { formatLeadEmail, INBOX, MATCHING_DISCLAIMER } from "../src/leadEmail.js";

export const MAX_BODY_BYTES = 1_000_000;
export const MAX_PHOTO_BYTES = 1_000_000;

const LIMITS = {
  name: 200,
  email: 200,
  phone: 32,
  notes: 4000,
  location: 300,
  metro: 80,
  id: 80,
  condition: 40,
  timeline: 40,
  createdAt: 40,
};

function clean(value, max) {
  if (value == null) return "";
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

export function isAllowedOrigin(origin, host) {
  if (!origin) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const hostname = url.hostname.toLowerCase();
  const reqHost = String(host || "")
    .split(":")[0]
    .toLowerCase();
  if (hostname === reqHost) return true;
  if (hostname === "curbquote.ai" || hostname === "www.curbquote.ai") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}

export function parseLeadBody(body) {
  if (body == null || body === "") return {};
  if (typeof body === "object" && !Buffer.isBuffer(body) && !(body instanceof ArrayBuffer)) {
    return body;
  }
  const raw = Buffer.isBuffer(body) ? body.toString("utf8") : String(body);
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function photoBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return 0;
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

function pickPhoto(input) {
  const photo = input?.photo;
  const dataUrl = photo?.dataUrl;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null;
  if (photoBytes(dataUrl) > MAX_PHOTO_BYTES) return null;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    name: clean(photo.name, 80) || "house.jpg",
    dataUrl,
    contentType: match[1],
    content: match[2],
  };
}

export function validateLead(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, status: 400, error: "Send a JSON object." };
  }

  const name = clean(input.name, LIMITS.name);
  const email = clean(input.email, LIMITS.email).toLowerCase();
  const phone = String(input.phone || "").replace(/[^\d+]/g, "").slice(0, LIMITS.phone);
  const metroId = clean(input.metroId, LIMITS.metro);
  const metroName = clean(input.metroName, LIMITS.metro);
  const digits = phone.replace(/\D/g, "");

  if (!name) {
    return { ok: false, status: 400, error: "Name is required." };
  }
  if (!digits && !email) {
    return { ok: false, status: 400, error: "Phone or email is required." };
  }
  if (!digits && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: "Phone or email is required." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, error: "Email looks invalid." };
  }
  if (!metroId && !metroName) {
    return { ok: false, status: 400, error: "Metro is required." };
  }

  const lead = {
    id: clean(input.id, LIMITS.id),
    createdAt: clean(input.createdAt, LIMITS.createdAt) || new Date().toISOString(),
    metroId,
    metroName,
    location: clean(input.location, LIMITS.location),
    stories: Number(input.stories) === 2 ? 2 : 1,
    sqft: input.sqft == null || input.sqft === "" ? null : Number(input.sqft),
    sqftUnknown: Boolean(input.sqftUnknown),
    assumedSqft: input.assumedSqft == null ? null : Number(input.assumedSqft),
    condition: clean(input.condition, LIMITS.condition),
    trim: Boolean(input.trim),
    hoa: Boolean(input.hoa),
    timeline: clean(input.timeline, LIMITS.timeline),
    estimateLow: Number(input.estimateLow),
    estimateHigh: Number(input.estimateHigh),
    name,
    phone: digits || phone,
    email,
    notes: clean(input.notes, LIMITS.notes),
  };

  return { ok: true, lead };
}

async function sendWithResend({ lead, photo, env, fetchImpl }) {
  const key = env.RESEND_API_KEY;
  const from = env.RESEND_FROM || "Curbquote <onboarding@resend.dev>";
  const text = formatLeadEmail(lead, {
    photoAttached: Boolean(photo),
    photoName: photo?.name,
  });
  const payload = {
    from,
    to: [INBOX],
    subject: `Curbquote lead — ${lead.metroName || lead.metroId} — ${lead.name}`,
    text,
  };
  if (lead.email) payload.reply_to = lead.email;
  if (photo) {
    payload.attachments = [
      {
        filename: photo.name,
        content: photo.content,
        content_type: photo.contentType,
      },
    ];
  }

  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend ${response.status} ${detail.slice(0, 180)}`);
  }
  return { via: "resend" };
}

async function sendWithFormSubmit({ lead, photo, fetchImpl }) {
  const text = formatLeadEmail(lead, {
    photoAttached: false,
    photoName: photo?.name,
  });
  const response = await fetchImpl(`https://formsubmit.co/ajax/${INBOX}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      _subject: `Curbquote lead — ${lead.metroName || lead.metroId} — ${lead.name}`,
      _template: "box",
      _captcha: "false",
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      metro: lead.metroName || lead.metroId,
      message: text,
    }),
  });
  const data = await response.json().catch(() => ({}));
  const ok =
    response.ok && (data.success === true || data.success === "true");
  if (!ok) {
    throw new Error(`FormSubmit ${response.status} ${JSON.stringify(data).slice(0, 180)}`);
  }
  return { via: "formsubmit" };
}

export async function deliverLead({ lead, photo, env, fetchImpl }) {
  const send = fetchImpl || fetch;
  if (env.RESEND_API_KEY) {
    return sendWithResend({ lead, photo, env, fetchImpl: send });
  }
  return sendWithFormSubmit({ lead, photo, fetchImpl: send });
}

export async function handleLeadRequest({
  method,
  origin,
  host,
  contentLength,
  body,
  env = {},
  fetchImpl,
}) {
  if (String(method || "GET").toUpperCase() !== "POST") {
    return { status: 405, json: { ok: false, error: "POST only." } };
  }
  if (!isAllowedOrigin(origin, host)) {
    return { status: 403, json: { ok: false, error: "Forbidden." } };
  }
  const size = Number(contentLength || 0);
  if (size > MAX_BODY_BYTES) {
    return { status: 413, json: { ok: false, error: "Request too large." } };
  }

  let parsed;
  try {
    parsed = parseLeadBody(body);
  } catch {
    return { status: 400, json: { ok: false, error: "JSON body required." } };
  }

  const checked = validateLead(parsed);
  if (!checked.ok) {
    return { status: checked.status, json: { ok: false, error: checked.error } };
  }

  const photo = pickPhoto(parsed);
  try {
    const sent = await deliverLead({
      lead: checked.lead,
      photo,
      env,
      fetchImpl,
    });
    return { status: 200, json: { ok: true, via: sent.via } };
  } catch (error) {
    console.error("lead email failed", error?.message || error);
    return {
      status: 502,
      json: { ok: false, error: "Could not deliver this request." },
    };
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  const result = await handleLeadRequest({
    method: req.method,
    origin: req.headers.origin,
    host: req.headers.host,
    contentLength: req.headers["content-length"],
    body: req.body,
    env: process.env,
  });
  res.status(result.status).json(result.json);
}

export { formatLeadEmail, INBOX, MATCHING_DISCLAIMER };
