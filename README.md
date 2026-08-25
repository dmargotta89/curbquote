# Curbquote

Photo-to-quote site for residential exterior painting. Homeowners in **Dallas–Fort Worth**, **Atlanta**, **Phoenix**, **Charlotte**, and **Tampa Bay** upload a house photo, answer a short form, and get an honest **ballpark estimate** — not a contract bid. Curbquote is not the painter and does not claim a license. Crews are third-party owner-operators matched later.

v1 emails each quote request to **hello@curbquote.ai** from a same-origin `/api/lead` function. A copy is also saved in this browser’s `localStorage`, so [/leads](/leads) still works if the network fails. Matching is **not** automated — do not contact crews from the lead email.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

A first-time visit should read as: add a photo of the house → answer a few questions → see an estimate range → leave name, phone, and email.

If this connection looks like Dallas–Fort Worth, Atlanta, Phoenix, Charlotte, or Tampa Bay, Curbquote preselects that metro and skips the city picker. The guess is a small “change” chip — IP lookup is often wrong on a VPN or when traveling. If the lookup is missing, unclear, or outside those five, the metro picker is shown as before.

`npm run dev` also serves `/api/lead` so a submit can leave the browser without `vercel dev`. Production on Vercel uses the function in `api/lead.js`.

Leads captured on this device: [/leads](/leads).

## How the lead reaches hello@

1. The homeowner submits the existing contact step. Fields always POST to `/api/lead`. A house photo is attached only if a thumbnail stays under ~1MB; oversized photos are skipped rather than failing the request.
2. If `RESEND_API_KEY` is set in the Vercel project (or local env), the function emails **hello@curbquote.ai** via [Resend](https://resend.com). `from` can stay `Curbquote <onboarding@resend.dev>` until the domain is verified. Optional: `RESEND_FROM`.
3. If no Resend key is set, the function forwards via [FormSubmit AJAX](https://formsubmit.co/ajax-documentation) to `https://formsubmit.co/ajax/hello@curbquote.ai`. **The first production send requires clicking FormSubmit’s confirmation email in hello@** (the ImprovMX inbox that forwards to the founder). No FormSubmit account is required.
4. If `/api/lead` fails, the UI still keeps the localStorage copy and asks the homeowner to email hello@ or retry. It does not claim a crew was matched.

Do not commit API keys. Set `RESEND_API_KEY` in the Vercel dashboard when you want Resend.

```bash
npm test
```

## Production build

```bash
npm install
npm run build
```

Preview the static build with `npm run preview` (`/api/lead` is not included there). On Vercel, `vercel.json` rewrites SPA routes to `index.html` but **excludes** `/api/*` so the lead function is not swallowed.

## How the estimate is calculated

This is a heuristic, labeled as an estimate throughout the UI:

- Living square footage × a metro rate band (~$2.50–$5.00 / sq ft)
- Two-story access adjustment
- Paint condition (good / fair / poor)
- Trim included or body only

If the homeowner is not sure of square footage, Curbquote uses a typical size for 1- or 2-story homes. A crew still has to walk the job before anyone can quote a price you can sign.
