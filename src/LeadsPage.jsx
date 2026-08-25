import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Brand from "./Brand.jsx";
import { CONDITIONS, TIMELINES, formatMoney } from "./estimate.js";
import { clearLeads, loadLeads } from "./leads.js";

function labelFor(list, id) {
  return list.find((item) => item.id === id)?.label ?? id;
}

export default function LeadsPage() {
  const [tick, setTick] = useState(0);
  const leads = useMemo(() => loadLeads(), [tick]);

  return (
    <div className="shell">
      <Brand compact />
      <div className="step-kicker">
        <Link className="back" to="/">
          ← Back to Curbquote
        </Link>
        <span>This device only</span>
      </div>
      <h1>Leads</h1>
      <p className="lede">
        v1 stores requests in this browser’s localStorage. There is no server,
        and nothing is sent to a crew yet.
      </p>
      {leads.length === 0 ? (
        <p className="empty">No leads on this device yet.</p>
      ) : (
        <div className="leads">
          {leads.map((lead) => (
            <article className="lead-card" key={lead.id}>
              <h3>{lead.name}</h3>
              <p className="meta">
                {lead.metroName} · {lead.location}
                <br />
                {lead.phone} · {lead.email}
                <br />
                {formatMoney(lead.estimateLow)} – {formatMoney(lead.estimateHigh)}{" "}
                <strong>(estimate)</strong>
                <br />
                {lead.stories}-story ·{" "}
                {lead.sqftUnknown
                  ? `sq ft not sure (~${lead.assumedSqft?.toLocaleString()})`
                  : `${lead.sqft?.toLocaleString()} sq ft`}{" "}
                · {labelFor(CONDITIONS, lead.condition)} ·{" "}
                {lead.trim ? "trim included" : "body only"} · HOA{" "}
                {lead.hoa ? "yes" : "no"} · {labelFor(TIMELINES, lead.timeline)}
                <br />
                {new Date(lead.createdAt).toLocaleString()}
              </p>
              {lead.photos?.length > 0 && (
                <div className="thumbs">
                  {lead.photos.map((photo) => (
                    <img key={photo.id} src={photo.dataUrl} alt="House submitted with lead" />
                  ))}
                </div>
              )}
            </article>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              clearLeads();
              setTick((value) => value + 1);
            }}
          >
            Clear leads on this device
          </button>
        </div>
      )}
    </div>
  );
}
