# Curbquote

Photo-to-quote site for residential exterior painting. Homeowners in **Dallas–Fort Worth**, **Atlanta**, **Phoenix**, **Charlotte**, and **Tampa Bay** upload a house photo, answer a short form, and get an honest **ballpark estimate** — not a contract bid. Curbquote is not the painter and does not claim a license. Crews are third-party owner-operators matched later.

v1 stores leads in this browser’s `localStorage`. There is no backend.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

A first-time visit should read as: add a photo of the house → answer a few questions → see an estimate range → leave name, phone, and email.

If this connection looks like Dallas–Fort Worth, Atlanta, Phoenix, Charlotte, or Tampa Bay, Curbquote preselects that metro and skips the city picker. The guess is a small “change” chip — IP lookup is often wrong on a VPN or when traveling. If the lookup is missing, unclear, or outside those five, the metro picker is shown as before.

Leads captured on this device: [/leads](/leads).

## Production build

```bash
npm install
npm run build
```

Preview the build with `npm run preview`.

## How the estimate is calculated

This is a heuristic, labeled as an estimate throughout the UI:

- Living square footage × a metro rate band (~$2.50–$5.00 / sq ft)
- Two-story access adjustment
- Paint condition (good / fair / poor)
- Trim included or body only

If the homeowner is not sure of square footage, Curbquote uses a typical size for 1- or 2-story homes. A crew still has to walk the job before anyone can quote a price you can sign.
