import { Link } from "react-router-dom";
import { Mark } from "./Brand.jsx";

export default function Footer() {
  return (
    <footer className="footer-links">
      <Link className="footer-brand" to="/" aria-label="Curbquote home">
        <Mark className="mark mark-footer" />
        <span>Five metros only. Third-party crews.</span>
      </Link>
      <nav className="footer-nav" aria-label="Site">
        <Link to="/terms">Terms</Link>
        <Link to="/leads">Leads on this device</Link>
      </nav>
    </footer>
  );
}
