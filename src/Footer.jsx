import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer-links">
      <span>Five metros only. Third-party crews.</span>
      <nav className="footer-nav" aria-label="Site">
        <Link to="/terms">Terms</Link>
        <Link to="/leads">Leads on this device</Link>
      </nav>
    </footer>
  );
}
