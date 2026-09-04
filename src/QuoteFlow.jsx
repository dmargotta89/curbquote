import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Brand, { Mark } from "./Brand.jsx";
import Footer from "./Footer.jsx";
import {
  CONDITIONS,
  METROS,
  TIMELINES,
  calculateEstimate,
  formatMoney,
  getMetro,
} from "./estimate.js";
import { detectMetroFromIp } from "./geo.js";
import { fallbackMailto } from "./leadEmail.js";
import { saveLead } from "./leads.js";
import { compressImage, isImageFile } from "./photos.js";
import { sendLead } from "./sendLead.js";

const EMPTY = {
  metroId: "",
  photos: [],
  location: "",
  stories: 1,
  sqft: "",
  sqftUnknown: false,
  condition: "fair",
  trim: true,
  hoa: false,
  timeline: "season",
  name: "",
  phone: "",
  email: "",
  notes: "",
};

function Choice({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className={`choice${selected ? " selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MetroChip({ metro, guessed, onChange }) {
  if (!metro) return null;
  return (
    <div className="metro-chip-row">
      <span className="metro-chip">
        {metro.name}
        <span aria-hidden="true"> · </span>
        <button type="button" onClick={onChange}>
          change
        </button>
      </span>
      {guessed && (
        <span className="metro-guess">
          Guessed from this connection. Change if the house is in another metro
          — IP lookup is often wrong on VPN or travel.
        </span>
      )}
    </div>
  );
}

export default function QuoteFlow() {
  const [step, setStep] = useState("checking");
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [metroSource, setMetroSource] = useState(null);
  const [resumeStep, setResumeStep] = useState("photos");
  const [delivered, setDelivered] = useState(false);
  const [submittedLead, setSubmittedLead] = useState(null);

  const metro = getMetro(form.metroId);
  const estimate = useMemo(
    () =>
      calculateEstimate({
        metroId: form.metroId,
        stories: form.stories,
        sqft: form.sqft,
        sqftUnknown: form.sqftUnknown,
        condition: form.condition,
        trim: form.trim,
      }),
    [form],
  );

  useEffect(() => {
    let cancelled = false;
    detectMetroFromIp().then((result) => {
      if (cancelled) return;
      if (result.metroId) {
        setForm((current) => ({ ...current, metroId: result.metroId }));
        setMetroSource("ip");
        setStep("photos");
      } else {
        setStep("metro");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(partial) {
    setError("");
    setForm((current) => ({ ...current, ...partial }));
  }

  async function addFiles(fileList) {
    const files = [...fileList].filter(isImageFile);
    if (!files.length) {
      setError("Please choose a photo of the house.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = [];
      for (const file of files) {
        next.push(await compressImage(file));
      }
      patch({
        photos: [...form.photos, ...next].slice(0, 5),
      });
    } catch {
      setError("We could not read that photo. Try another image.");
    } finally {
      setBusy(false);
    }
  }

  function removePhoto(id) {
    patch({ photos: form.photos.filter((photo) => photo.id !== id) });
  }

  function changeMetro() {
    setResumeStep(step === "metro" ? "photos" : step);
    setStep("metro");
  }

  function goDetails() {
    if (!form.photos.length) {
      setError("A front photo of the house is required.");
      return;
    }
    setStep("details");
  }

  function goEstimate() {
    if (!form.location.trim()) {
      setError("Add a ZIP or street address so we can match a local crew.");
      return;
    }
    if (!form.sqftUnknown) {
      const n = Number(form.sqft);
      if (!n || n < 400 || n > 12000) {
        setError("Enter an approximate square footage, or choose “not sure.”");
        return;
      }
    }
    setStep("estimate");
  }

  async function submitLead(event) {
    event.preventDefault();
    if (busy) return;
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.replace(/[^\d]/g, "");
    const notes = form.notes.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (phone.length < 10) {
      setError("Enter a phone number we can actually reach.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }

    const lead = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      metroId: form.metroId,
      metroName: metro?.name ?? "",
      location: form.location.trim(),
      stories: form.stories,
      sqft: form.sqftUnknown ? null : Number(form.sqft),
      sqftUnknown: form.sqftUnknown,
      assumedSqft: estimate.baseSqft,
      condition: form.condition,
      trim: form.trim,
      hoa: form.hoa,
      timeline: form.timeline,
      estimateLow: estimate.low,
      estimateHigh: estimate.high,
      name,
      phone,
      email,
      notes,
      photos: form.photos,
    };
    saveLead(lead);
    setBusy(true);
    setError("");
    let ok = false;
    try {
      const result = await sendLead(lead);
      ok = Boolean(result?.ok);
    } catch {
      ok = false;
    }
    setSubmittedLead(lead);
    setDelivered(ok);
    setBusy(false);
    setStep("done");
  }

  async function retrySend() {
    if (!submittedLead || busy) return;
    setBusy(true);
    let ok = false;
    try {
      const result = await sendLead(submittedLead);
      ok = Boolean(result?.ok);
    } catch {
      ok = false;
    }
    setDelivered(ok);
    setBusy(false);
  }

  const changing = Boolean(metro) && step === "metro";

  return (
    <div className="shell">
      <Brand />

      {step === "checking" && (
        <section>
          <h1>An honest ballpark for painting the outside of your house.</h1>
          <p className="lede">
            Starting in Tampa Bay. Homeowners in five metros upload a photo,
            answer a few questions, and get a range — not a contract price.
            Curbquote is not the painter. Local owner-operator crews are
            matched later.
          </p>
          <p className="hero-note">
            We do not hold a contractor license, and this is not a bid you can
            sign. It is a planning number so you know the neighborhood before a
            crew walks the job.
          </p>
          <p className="hint">Checking this connection for one of our five metros…</p>
        </section>
      )}

      {step === "metro" && (
        <section>
          {changing ? (
            <>
              <button type="button" className="back" onClick={() => setStep(resumeStep)}>
                ← Keep {metro.name}
              </button>
              <h2>Where is the house?</h2>
              <p className="lede">
                {metroSource === "ip"
                  ? `We guessed ${metro.name} from this connection. That can be wrong on a VPN or if you are traveling. Pick the metro for the house.`
                  : "Pick the metro for the house."}
              </p>
            </>
          ) : (
            <>
              <h1>An honest ballpark for painting the outside of your house.</h1>
              <p className="lede">
                Starting in Tampa Bay. Homeowners in five metros upload a photo,
                answer a few questions, and get a range — not a contract price.
                Curbquote is not the painter. Local owner-operator crews are
                matched later.
              </p>
              <p className="hero-note">
                We do not hold a contractor license, and this is not a bid you can
                sign. It is a planning number so you know the neighborhood before a
                crew walks the job.
              </p>
              <h2>Where is the house?</h2>
            </>
          )}
          <div className="metro-grid">
            {METROS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="metro"
                onClick={() => {
                  patch({ metroId: item.id });
                  setMetroSource("user");
                  setStep(changing ? resumeStep : "photos");
                }}
              >
                <span>
                  <strong>{item.name}</strong>
                  <span>{item.region}</span>
                </span>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "photos" && (
        <section className="card">
          <div className="step-kicker">
            <span>Step 1 of 4</span>
          </div>
          <MetroChip metro={metro} guessed={metroSource === "ip"} onChange={changeMetro} />
          <h2>Photo of the house</h2>
          <p className="lede">
            A street-facing shot of the front is enough. Extra sides, trim, or
            peeling paint help, but they are optional.
          </p>
          {error && <p className="error">{error}</p>}
          <label
            className={`drop${drag ? " drag" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDrag(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <strong>{busy ? "Preparing photo…" : "Add a photo"}</strong>
            <p>Tap to take a picture or choose from your camera roll.</p>
          </label>
          {form.photos.length > 0 && (
            <div className="photos">
              {form.photos.map((photo, index) => (
                <div className="photo" key={photo.id}>
                  <img src={photo.dataUrl} alt={index === 0 ? "Front of house" : `Extra house photo ${index + 1}`} />
                  {index === 0 && <span className="badge">Required</span>}
                  <button
                    type="button"
                    className="remove"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(photo.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="actions">
            <button type="button" className="btn primary" onClick={goDetails} disabled={busy}>
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "details" && (
        <section className="card">
          <div className="step-kicker">
            <button type="button" className="back" onClick={() => setStep("photos")}>
              ← Photos
            </button>
            <span>Step 2 of 4</span>
          </div>
          <MetroChip metro={metro} guessed={metroSource === "ip"} onChange={changeMetro} />
          <h2>A few facts about the house</h2>
          {error && <p className="error">{error}</p>}

          <div className="field">
            <label htmlFor="location">ZIP or street address</label>
            <input
              id="location"
              type="text"
              autoComplete="street-address"
              placeholder="33606 or 1842 Bayshore Blvd, Tampa"
              value={form.location}
              onChange={(event) => patch({ location: event.target.value })}
            />
          </div>

          <div className="field">
            <span className="legend">Stories</span>
            <div className="choices two">
              <Choice selected={form.stories === 1} onClick={() => patch({ stories: 1 })}>
                1 story
              </Choice>
              <Choice selected={form.stories === 2} onClick={() => patch({ stories: 2 })}>
                2 stories
              </Choice>
            </div>
          </div>

          <div className="field">
            <label htmlFor="sqft">Approximate living square feet</label>
            <input
              id="sqft"
              type="number"
              min="400"
              max="12000"
              inputMode="numeric"
              placeholder="2200"
              disabled={form.sqftUnknown}
              value={form.sqftUnknown ? "" : form.sqft}
              onChange={(event) => patch({ sqft: event.target.value, sqftUnknown: false })}
            />
            <label className="inline-check">
              <input
                type="checkbox"
                checked={form.sqftUnknown}
                onChange={(event) =>
                  patch({ sqftUnknown: event.target.checked, sqft: event.target.checked ? "" : form.sqft })
                }
              />
              Not sure — use a typical size for this story count
            </label>
          </div>

          <div className="field">
            <span className="legend">Paint condition</span>
            <div className="choices">
              {CONDITIONS.map((item) => (
                <Choice
                  key={item.id}
                  selected={form.condition === item.id}
                  onClick={() => patch({ condition: item.id })}
                >
                  {item.label}
                  <small>{item.hint}</small>
                </Choice>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="legend">Paint the trim too?</span>
            <div className="choices two">
              <Choice selected={form.trim} onClick={() => patch({ trim: true })}>
                Yes, include trim
              </Choice>
              <Choice selected={!form.trim} onClick={() => patch({ trim: false })}>
                Body only
              </Choice>
            </div>
          </div>

          <div className="field">
            <span className="legend">HOA?</span>
            <div className="choices two">
              <Choice selected={form.hoa} onClick={() => patch({ hoa: true })}>
                Yes
              </Choice>
              <Choice selected={!form.hoa} onClick={() => patch({ hoa: false })}>
                No
              </Choice>
            </div>
            <p className="hint">Does not change the estimate. Crews just need to know.</p>
          </div>

          <div className="field">
            <span className="legend">Timeline</span>
            <div className="choices">
              {TIMELINES.map((item) => (
                <Choice
                  key={item.id}
                  selected={form.timeline === item.id}
                  onClick={() => patch({ timeline: item.id })}
                >
                  {item.label}
                </Choice>
              ))}
            </div>
          </div>

          <div className="actions">
            <button type="button" className="btn primary" onClick={goEstimate}>
              See estimate
            </button>
          </div>
        </section>
      )}

      {step === "estimate" && estimate && (
        <section className="card">
          <div className="step-kicker">
            <button type="button" className="back" onClick={() => setStep("details")}>
              ← Details
            </button>
            <span>Step 3 of 4</span>
          </div>
          <MetroChip metro={metro} guessed={metroSource === "ip"} onChange={changeMetro} />
          <div className="estimate-head">
            <span className="flag">Estimate — not a bid</span>
            <Mark className="mark mark-sm" />
          </div>
          <p className="estimate-range">
            {formatMoney(estimate.low)} – {formatMoney(estimate.high)}
          </p>
          <p className="fineprint">
            Ballpark for exterior paint in {metro.name}
            {estimate.assumed
              ? `, using a typical ${form.stories}-story home (~${estimate.baseSqft.toLocaleString()} sq ft)`
              : ` on about ${estimate.baseSqft.toLocaleString()} sq ft`}
            . {form.trim ? "Includes trim." : "Body only, no trim."} This is a
            heuristic, not a walkthrough, and not a price anyone is offering to
            contract at.
          </p>
          <ul className="breakdown">
            <li>
              <span>Market rate used</span>
              <span>
                ${estimate.rateLow.toFixed(2)}–${estimate.rateHigh.toFixed(2)} / sq ft
              </span>
            </li>
            <li>
              <span>Stories / access</span>
              <span>{form.stories === 2 ? "Two-story adjustment" : "One story"}</span>
            </li>
            <li>
              <span>Condition</span>
              <span>{CONDITIONS.find((item) => item.id === form.condition)?.label}</span>
            </li>
            <li>
              <span>HOA</span>
              <span>{form.hoa ? "Yes" : "No"}</span>
            </li>
          </ul>
          <p className="fineprint" style={{ marginTop: 16 }}>
            Next we take a name, phone, and email so a local owner-operator
            crew can be matched later. No one is booked from this screen. Read
            how matching and the $150 walkthrough deposit work in{" "}
            <Link to="/terms" target="_blank" rel="noreferrer">
              Terms
            </Link>{" "}
            before you leave contact info.
          </p>
          <div className="actions">
            <button type="button" className="btn primary" onClick={() => setStep("contact")}>
              Leave my info
            </button>
            <button type="button" className="btn ghost" onClick={() => setStep("details")}>
              Adjust the house details
            </button>
          </div>
        </section>
      )}

      {step === "contact" && estimate && (
        <section className="card">
          <div className="step-kicker">
            <button type="button" className="back" onClick={() => setStep("estimate")}>
              ← Estimate
            </button>
            <span>Step 4 of 4</span>
          </div>
          <MetroChip metro={metro} guessed={metroSource === "ip"} onChange={changeMetro} />
          <h2>Who should we follow up with?</h2>
          <p className="lede">
            Curbquote emails this request to{" "}
            <a href="mailto:hello@curbquote.ai">hello@curbquote.ai</a>
            . A copy also stays on this device if the network fails. Curbquote
            is the matching layer — not the contractor. How estimates, crew
            matching, and the $150 walkthrough deposit work is in{" "}
            <Link to="/terms" target="_blank" rel="noreferrer">
              Terms
            </Link>
            .
          </p>
          {error && <p className="error">{error}</p>}
          <form onSubmit={submitLead}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(813) 555-0199"
                value={form.phone}
                onChange={(event) => patch({ phone: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => patch({ email: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Anything we should know about the house"
                value={form.notes}
                onChange={(event) => patch({ notes: event.target.value })}
              />
            </div>
            <p className="hint">
              Range on file: {formatMoney(estimate.low)} – {formatMoney(estimate.high)}. Still an
              estimate, not a contract. Leaving this info is not a payment or a
              booking. See{" "}
              <Link to="/terms" target="_blank" rel="noreferrer">
                Terms
              </Link>{" "}
              before you submit.
            </p>
            <div className="actions">
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? "Sending…" : "Send my request"}
              </button>
            </div>
          </form>
        </section>
      )}

      {step === "done" && estimate && (
        <section className="card">
          <MetroChip metro={metro} guessed={metroSource === "ip"} onChange={changeMetro} />
          {delivered ? (
            <>
              <span className="flag">Request received</span>
              <h2>Curbquote has your request.</h2>
              <p className="lede">
                {form.name.split(" ")[0]}, we emailed your {metro.name} estimate
                of {formatMoney(estimate.low)} – {formatMoney(estimate.high)} to{" "}
                <a href="mailto:hello@curbquote.ai">hello@curbquote.ai</a>
                . We will follow up. No crew is matched or assigned from this
                screen — matching is still done by hand.
              </p>
            </>
          ) : (
            <>
              <span className="flag">Saved on this device</span>
              <h2>This device has the request. Curbquote may not.</h2>
              <p className="lede">
                {form.name.split(" ")[0]}, the {metro.name} estimate of{" "}
                {formatMoney(estimate.low)} – {formatMoney(estimate.high)} is
                saved in this browser, but it did not reach hello@curbquote.ai.
                Email that inbox or try sending again. Do not wait for a crew
                — none was contacted.
              </p>
            </>
          )}
          <div className="actions">
            {!delivered && (
              <>
                <a
                  className="btn primary"
                  href={fallbackMailto(
                    submittedLead || {
                      ...form,
                      metroName: metro?.name,
                      estimateLow: estimate.low,
                      estimateHigh: estimate.high,
                      createdAt: new Date().toISOString(),
                    },
                  )}
                >
                  Email hello@curbquote.ai
                </a>
                <button type="button" className="btn ghost" onClick={retrySend} disabled={busy}>
                  {busy ? "Sending…" : "Try sending again"}
                </button>
              </>
            )}
            <button
              type="button"
              className={delivered ? "btn primary" : "btn ghost"}
              onClick={() => {
                const keepMetro = form.metroId;
                const keepSource = metroSource;
                setForm({ ...EMPTY, metroId: keepMetro });
                setMetroSource(keepSource);
                setDelivered(false);
                setSubmittedLead(null);
                setStep("photos");
              }}
            >
              Start another house
            </button>
            <Link className="btn ghost" to="/leads">
              View leads on this device
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
