import { Link } from "react-router-dom";
import Brand from "./Brand.jsx";
import Footer from "./Footer.jsx";

export default function TermsPage() {
  return (
    <div className="shell">
      <Brand />
      <div className="step-kicker">
        <Link className="back" to="/">
          ← Back to Curbquote
        </Link>
        <span>Terms</span>
      </div>
      <h1>How this works</h1>
      <p className="lede">
        Short operating rules — not a 10-page contract. Read this before you
        leave a name, phone, or email.
      </p>

      <section className="card">
        <div className="terms-section">
          <h2>Who we are</h2>
          <p>
            Curbquote is not the painter and does not claim a contractor
            license. Crews are third-party owner-operators. Curbquote is not
            the general contractor of record.
          </p>
        </div>

        <div className="terms-section">
          <h2>The photo estimate</h2>
          <p>
            The range from photos is a ballpark, not a contract bid. A crew
            must walk the job before anyone can quote a price a homeowner can
            sign.
          </p>
        </div>

        <div className="terms-section">
          <h2>Requesting a crew</h2>
          <p>
            After a homeowner requests a crew, Curbquote collects a $150
            walkthrough deposit. First jobs may be paid with a payment link,
            not in this app. Curbquote does not take full job payment until
            after a walkthrough.
          </p>
        </div>

        <div className="terms-section">
          <h2>The $150 deposit</h2>
          <ul>
            <li>
              Refunded automatically if Curbquote cannot arrange a crew
              walkthrough within 72 hours, or if the assigned crew no-shows.
            </li>
            <li>
              Applied to the job if the homeowner proceeds with a crew
              Curbquote introduced.
            </li>
            <li>
              Kept by Curbquote if the homeowner no-shows the scheduled
              walkthrough.
            </li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>Where we work</h2>
          <p>
            Crew matching and walkthroughs start in Dallas–Fort Worth.
            Homeowners can already get a photo estimate in Atlanta, Phoenix,
            Charlotte, and Tampa Bay. Matching rolls out market by market,
            DFW first.
          </p>
        </div>

        <div className="terms-section">
          <h2>Questions or disputes</h2>
          <p>
            Email{" "}
            <a href="mailto:hello@curbquote.ai">hello@curbquote.ai</a>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
