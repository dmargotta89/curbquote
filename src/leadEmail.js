export const INBOX = "hello@curbquote.ai";

export const MATCHING_DISCLAIMER =
  "Matching is not automated. Do not contact crews from this email. CoS will RFQ 3 DFW owner-operators by hand.";

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "not provided";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function sqftLine(lead) {
  if (lead.sqftUnknown || lead.sqft == null || lead.sqft === "") {
    const assumed = Number(lead.assumedSqft);
    if (Number.isFinite(assumed) && assumed > 0) {
      return `not sure (using ~${assumed.toLocaleString("en-US")} sq ft)`;
    }
    return "not sure";
  }
  const n = Number(lead.sqft);
  return Number.isFinite(n) ? `${n.toLocaleString("en-US")} sq ft` : String(lead.sqft);
}

export function formatLeadEmail(lead, extras = {}) {
  const notes = String(lead.notes || "").trim() || "(none)";
  const photoLine = extras.photoAttached
    ? `Photo: attached (${extras.photoName || "house.jpg"})`
    : "Photo: not included. Form fields were sent anyway; oversized photos are skipped rather than failing the request.";

  return [
    "Curbquote quote request",
    "",
    MATCHING_DISCLAIMER,
    "",
    `Timestamp: ${lead.createdAt || "(missing)"}`,
    `Metro: ${lead.metroName || lead.metroId || "(missing)"}`,
    `ZIP / address: ${String(lead.location || "").trim() || "(none)"}`,
    `Stories: ${lead.stories ?? "(none)"}`,
    `Sq ft: ${sqftLine(lead)}`,
    `Condition: ${lead.condition || "(none)"}`,
    `Trim: ${lead.trim ? "yes, include trim" : "body only"}`,
    `HOA: ${lead.hoa ? "yes" : "no"}`,
    `Timeline: ${lead.timeline || "(none)"}`,
    `Estimate range: ${money(lead.estimateLow)} – ${money(lead.estimateHigh)} (not a bid)`,
    `Name: ${lead.name || "(missing)"}`,
    `Phone: ${lead.phone || "(none)"}`,
    `Email: ${lead.email || "(none)"}`,
    `Notes: ${notes}`,
    photoLine,
  ].join("\n");
}

export function fallbackMailto(lead) {
  const subject = `Curbquote quote request — ${lead.metroName || lead.metroId || "lead"}`;
  const body = formatLeadEmail(lead, { photoAttached: false });
  return `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
