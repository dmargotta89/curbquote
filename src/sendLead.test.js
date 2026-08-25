import assert from "node:assert/strict";
import { test } from "node:test";
import { approxDataUrlBytes, buildLeadPayload } from "./sendLead.js";

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
