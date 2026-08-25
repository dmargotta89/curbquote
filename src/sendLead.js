import { formatLeadEmail, INBOX } from "./leadEmail.js";

const MAX_JSON_CHARS = 900_000;
const MAX_PHOTO_BYTES = 1_000_000;

export function approxDataUrlBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return 0;
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

function fieldsOnly(lead) {
  return {
    id: lead.id,
    createdAt: lead.createdAt,
    metroId: lead.metroId,
    metroName: lead.metroName,
    location: lead.location,
    stories: lead.stories,
    sqft: lead.sqft,
    sqftUnknown: lead.sqftUnknown,
    assumedSqft: lead.assumedSqft,
    condition: lead.condition,
    trim: lead.trim,
    hoa: lead.hoa,
    timeline: lead.timeline,
    estimateLow: lead.estimateLow,
    estimateHigh: lead.estimateHigh,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    notes: lead.notes || "",
  };
}

async function shrinkDataUrl(dataUrl, maxEdge = 480, quality = 0.52) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return null;
  }
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

export async function selectPhoto(photo) {
  const dataUrl = photo?.dataUrl;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null;
  const name = photo.name || "house.jpg";
  if (approxDataUrlBytes(dataUrl) <= MAX_PHOTO_BYTES) {
    return { name, dataUrl };
  }
  try {
    const smaller = await shrinkDataUrl(dataUrl);
    if (smaller && approxDataUrlBytes(smaller) <= MAX_PHOTO_BYTES) {
      return { name, dataUrl: smaller };
    }
  } catch {
    // Skip the photo rather than fail the request.
  }
  return null;
}

export async function buildLeadPayload(lead) {
  const payload = fieldsOnly(lead);
  const photo = await selectPhoto(lead.photos?.[0]);
  if (!photo) return payload;
  const withPhoto = { ...payload, photo };
  if (JSON.stringify(withPhoto).length > MAX_JSON_CHARS) return payload;
  return withPhoto;
}

function formSubmitBody(fields) {
  return {
    _subject: `Curbquote lead — ${fields.metroName || fields.metroId} — ${fields.name}`,
    _template: "box",
    _captcha: "false",
    name: fields.name,
    phone: fields.phone,
    email: fields.email,
    metro: fields.metroName || fields.metroId,
    message: formatLeadEmail(fields, { photoAttached: false }),
  };
}

export async function sendViaFormSubmit(fields, fetchImpl = fetch) {
  const response = await fetchImpl(`https://formsubmit.co/ajax/${INBOX}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formSubmitBody(fields)),
  });
  const data = await response.json().catch(() => ({}));
  const ok = response.ok && (data.success === true || data.success === "true");
  if (!ok) return { ok: false };
  return { ok: true, via: "formsubmit" };
}

export async function sendLead(lead, fetchImpl = fetch) {
  const body = await buildLeadPayload(lead);
  try {
    const response = await fetchImpl("/api/lead", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true, via: "api" };
  } catch {
    // Browser FormSubmit is the zero-config path when the function cannot
    // reach FormSubmit (Cloudflare often challenges datacenter IPs).
  }
  try {
    return await sendViaFormSubmit(body, fetchImpl);
  } catch {
    return { ok: false };
  }
}
