import assert from "node:assert/strict";
import { test } from "node:test";
import { approxDataUrlBytes, buildLeadPayload, sendLead } from "./sendLead.js";

const lead = {
  id: "lead-1",
  createdAt: "2026-08-25T21:00:00.000Z",
  metroId: "dfw",
  metroName: "Dallas–Fort Worth",
  location: "75001",
  stories: 1,
  sqft: 1800,
  sqftUnknown: false,
  assumedSqft: 1800,
  condition: "good",
  trim: false,
  hoa: true,
  timeline: "research",
  estimateLow: 5000,
  estimateHigh: 8000,
  name: "Sam",
  phone: "2145550100",
  email: "sam@example.com",
  notes: "Front only",
};

test("payload always includes form fields and never the full photos array", async () => {
  const payload = await buildLeadPayload({
    ...lead,
    photos: [{ id: "p1", name: "house.jpg", dataUrl: "data:image/jpeg;base64,aaaa" }],
  });
  assert.equal(payload.name, "Sam");
  assert.equal(payload.metroId, "dfw");
  assert.equal(payload.notes, "Front only");
  assert.equal(payload.photos, undefined);
  assert.equal(payload.photo.name, "house.jpg");
});

test("drops a photo that would blow the request", async () => {
  const huge = `data:image/jpeg;base64,${"B".repeat(2_000_000)}`;
  assert.ok(approxDataUrlBytes(huge) > 1_000_000);
  const payload = await buildLeadPayload({
    ...lead,
    photos: [{ id: "p1", name: "huge.jpg", dataUrl: huge }],
  });
  assert.equal(payload.photo, undefined);
  assert.equal(payload.email, "sam@example.com");
});

test("uses /api/lead when it succeeds and does not double-send", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const result = await sendLead(lead, fetchImpl);
  assert.equal(result.ok, true);
  assert.equal(result.via, "api");
  assert.deepEqual(urls, ["/api/lead"]);
});

test("falls back to FormSubmit AJAX when /api/lead fails", async () => {
  const urls = [];
  const fetchImpl = async (url, init) => {
    urls.push(url);
    if (url === "/api/lead") {
      return { ok: false, status: 502, json: async () => ({ ok: false }) };
    }
    const payload = JSON.parse(init.body);
    assert.match(payload.message, /Matching is not automated/);
    assert.equal(payload.email, "sam@example.com");
    return { ok: true, status: 200, json: async () => ({ success: "true" }) };
  };
  const result = await sendLead(lead, fetchImpl);
  assert.equal(result.ok, true);
  assert.equal(result.via, "formsubmit");
  assert.equal(urls[0], "/api/lead");
  assert.equal(urls[1], "https://formsubmit.co/ajax/hello@curbquote.ai");
});

test("returns failure when both delivery paths fail", async () => {
  const fetchImpl = async () => {
    throw new Error("offline");
  };
  const result = await sendLead(lead, fetchImpl);
  assert.equal(result.ok, false);
});
