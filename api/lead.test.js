import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_BODY_BYTES,
  MATCHING_DISCLAIMER,
  deliverLead,
  formatLeadEmail,
  handleLeadRequest,
  isAllowedOrigin,
  validateLead,
} from "./lead.js";
import { buildLeadPayload } from "../src/sendLead.js";

const baseLead = {
  id: "lead-1",
  createdAt: "2026-08-25T21:00:00.000Z",
  metroId: "dfw",
  metroName: "Dallas–Fort Worth",
  location: "75001",
  stories: 2,
  sqft: 2200,
  sqftUnknown: false,
  assumedSqft: 2200,
  condition: "fair",
  trim: true,
  hoa: false,
  timeline: "season",
  estimateLow: 8400,
  estimateHigh: 13800,
  name: "Jane Homeowner",
  phone: "2145550199",
  email: "jane@example.com",
  notes: "Peeling trim on the south side.",
};

test("rejects empty name, missing contact, and missing metro", () => {
  assert.equal(validateLead({ ...baseLead, name: "  " }).ok, false);
  assert.equal(validateLead({ ...baseLead, phone: "", email: "" }).ok, false);
  assert.equal(validateLead({ ...baseLead, metroId: "", metroName: "" }).ok, false);
  assert.equal(validateLead({ ...baseLead, phone: "", email: "jane@example.com" }).ok, true);
  assert.equal(validateLead({ ...baseLead, phone: "2145550199", email: "" }).ok, true);
});

test("email body includes required fields and the no-matching line", () => {
  const body = formatLeadEmail(baseLead, { photoAttached: false });
  assert.match(body, new RegExp(MATCHING_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(body, /Timestamp: 2026-08-25T21:00:00.000Z/);
  assert.match(body, /Metro: Dallas–Fort Worth/);
  assert.match(body, /Stories: 2/);
  assert.match(body, /Sq ft: 2,200 sq ft/);
  assert.match(body, /Condition: fair/);
  assert.match(body, /Trim: yes, include trim/);
  assert.match(body, /Estimate range: \$8,400 – \$13,800 \(not a bid\)/);
  assert.match(body, /Name: Jane Homeowner/);
  assert.match(body, /Phone: 2145550199/);
  assert.match(body, /Email: jane@example.com/);
  assert.match(body, /Notes: Peeling trim on the south side\./);
  assert.doesNotMatch(body, /crew list|owner-operator roster|555-01/i);
});

test("origin allowlist is same-origin, not wide open", () => {
  assert.equal(isAllowedOrigin("https://curbquote.ai", "curbquote.ai"), true);
  assert.equal(isAllowedOrigin("https://curbquote-git-main.vercel.app", "curbquote-git-main.vercel.app"), true);
  assert.equal(isAllowedOrigin("http://localhost:5173", "localhost:5173"), true);
  assert.equal(isAllowedOrigin("", "curbquote.ai"), true);
  assert.equal(isAllowedOrigin("https://evil.example", "curbquote.ai"), false);
});

test("POST-only, body cap, and no crew leak on errors", async () => {
  const get = await handleLeadRequest({ method: "GET", body: baseLead, env: {} });
  assert.equal(get.status, 405);

  const huge = await handleLeadRequest({
    method: "POST",
    contentLength: MAX_BODY_BYTES + 1,
    body: baseLead,
    origin: "https://curbquote.ai",
    host: "curbquote.ai",
    env: {},
  });
  assert.equal(huge.status, 413);

  const blocked = await handleLeadRequest({
    method: "POST",
    origin: "https://evil.example",
    host: "curbquote.ai",
    body: baseLead,
    env: {},
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json.error, "Forbidden.");
});

test("uses Resend when RESEND_API_KEY is set", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "re_123" }),
      text: async () => "",
    };
  };
  const sent = await deliverLead({
    lead: validateLead(baseLead).lead,
    photo: null,
    env: { RESEND_API_KEY: "re_test" },
    fetchImpl,
  });
  assert.equal(sent.via, "resend");
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.from, "Curbquote <onboarding@resend.dev>");
  assert.deepEqual(payload.to, ["hello@curbquote.ai"]);
  assert.match(payload.text, /Matching is not automated/);
});

test("falls back to FormSubmit when no Resend key", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: "true" }),
      text: async () => "",
    };
  };
  const sent = await deliverLead({
    lead: validateLead(baseLead).lead,
    photo: null,
    env: {},
    fetchImpl,
  });
  assert.equal(sent.via, "formsubmit");
  assert.equal(calls[0].url, "https://formsubmit.co/ajax/hello@curbquote.ai");
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload._subject.startsWith("Curbquote lead"), true);
  assert.match(payload.message, /Notes: Peeling trim/);
});

test("handleLeadRequest emails on success and hides delivery errors", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
    text: async () => "",
  });
  const ok = await handleLeadRequest({
    method: "POST",
    origin: "https://curbquote.ai",
    host: "curbquote.ai",
    body: baseLead,
    env: {},
    fetchImpl,
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.ok, true);

  const fail = await handleLeadRequest({
    method: "POST",
    origin: "https://curbquote.ai",
    host: "curbquote.ai",
    body: baseLead,
    env: {},
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(fail.status, 502);
  assert.equal(fail.json.error, "Could not deliver this request.");
});

test("skips oversized photos and still sends fields", async () => {
  const huge = `data:image/jpeg;base64,${"A".repeat(1_500_000)}`;
  const payload = await buildLeadPayload({
    ...baseLead,
    photos: [{ id: "p1", name: "house.jpg", dataUrl: huge }],
  });
  assert.equal(payload.photo, undefined);
  assert.equal(payload.name, "Jane Homeowner");
  assert.equal(payload.metroId, "dfw");

  let resendBody;
  const fetchImpl = async (url, init) => {
    resendBody = JSON.parse(init.body);
    return { ok: true, status: 200, json: async () => ({ id: "x" }), text: async () => "" };
  };
  await handleLeadRequest({
    method: "POST",
    origin: "https://curbquote.ai",
    host: "curbquote.ai",
    body: { ...baseLead, photo: { name: "house.jpg", dataUrl: huge } },
    env: { RESEND_API_KEY: "re_test" },
    fetchImpl,
  });
  assert.equal(resendBody.attachments, undefined);
  assert.match(resendBody.text, /Photo: not included/);
});

test("attaches a small thumbnail when under 1MB", async () => {
  const tiny =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//9k=";
  const payload = await buildLeadPayload({
    ...baseLead,
    photos: [{ id: "p1", name: "front.jpg", dataUrl: tiny }],
  });
  assert.equal(payload.photo.name, "front.jpg");

  let resendBody;
  await handleLeadRequest({
    method: "POST",
    origin: "https://curbquote.ai",
    host: "curbquote.ai",
    body: payload,
    env: { RESEND_API_KEY: "re_test" },
    fetchImpl: async (_url, init) => {
      resendBody = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ id: "x" }), text: async () => "" };
    },
  });
  assert.equal(resendBody.attachments[0].filename, "front.jpg");
  assert.match(resendBody.text, /Photo: attached \(front.jpg\)/);
});
