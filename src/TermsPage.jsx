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
        leave a name, phone, or email. On this page, “you” is the homeowner,
        “the crew” is the painter, and “Curbquote” is us.
      </p>

      <section className="card">
        <div className="terms-section">
          <h2>Who we are</h2>
          <p>
            Curbquote is not the painter and does not claim a contractor
            license. The crew is a third-party owner-operator. Curbquote is
            not the general contractor of record. When you submit a quote
            request, Curbquote emails it to{" "}
            <a href="mailto:hello@curbquote.ai">hello@curbquote.ai</a>.
          </p>
        </div>

        <div className="terms-section">
          <h2>The photo estimate</h2>
          <p>
            The range from photos is a ballpark, not a contract bid. The crew
            must walk the job before anyone can quote a price you can sign.
          </p>
        </div>

        <div className="terms-section">
          <h2>The $150 walkthrough deposit</h2>
          <p>
            After you request a crew, Curbquote collects a $150 walkthrough
            deposit. That deposit is for the walkthrough, not for paint. On
            first jobs, Curbquote may collect it with a payment link, not in
            this app. Curbquote does not take full job payment until after a
            walkthrough. If you proceed with a crew Curbquote introduced,
            Curbquote applies the $150 to the job.
          </p>
          <ul>
            <li>
              If Curbquote cannot arrange a walkthrough within 72 hours,
              Curbquote refunds your $150.
            </li>
            <li>
              If the assigned crew no-shows, you choose: Curbquote refunds
              your $150, or Curbquote rematches you with another crew.
              Curbquote never keeps the deposit because Curbquote or the crew
              no-showed.
            </li>
            <li>
              If you miss the scheduled walkthrough, you get one free
              reschedule. If you miss that rescheduled walkthrough too,
              Curbquote keeps the $150.
            </li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>Quotes from crews</h2>
          <p>
            After the $150 walkthrough deposit, Curbquote sends a request for
            quote to multiple local owner-operator crews. Crews send quotes to
            Curbquote, not to you.
          </p>
        </div>

        <div className="terms-section">
          <h2>Paying Curbquote</h2>
          <p>
            You choose a quote and pay Curbquote — a deposit toward the job,
            or the full amount. Curbquote is the payment middleman. Payments
            will use Stripe Connect when live. First jobs may use a payment
            link. Curbquote’s take is 10% of the job. The crew’s share is 90%.
          </p>
        </div>

        <div className="terms-section">
          <h2>Starting and finishing the job</h2>
          <ul>
            <li>
              Once Curbquote receives your payment, Curbquote confirms the
              job to the crew you chose. That crew can receive up to half of
              the crew’s 90% to start.
            </li>
            <li>
              When the crew marks the job complete, you confirm you are
              satisfied and Curbquote releases the rest of the crew’s share.
            </li>
            <li>
              If you do not dispute, Curbquote auto-releases the remainder 72
              hours after the crew marks the job complete. If you dispute,
              Curbquote pauses the release and steps in as arbiter.
            </li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>Where we work</h2>
          <p>
            Curbquote starts crew matching and walkthroughs in Tampa Bay.
            You can already get a photo estimate in Dallas–Fort Worth,
            Atlanta, Phoenix, and Charlotte. Matching rolls out market by
            market, Tampa Bay first.
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
