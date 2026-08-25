import { Link } from "react-router-dom";

export function Mark({ className = "mark" }) {
  return (
    <img
      className={className}
      src="/mark.png"
      alt=""
      width="317"
      height="256"
      decoding="async"
    />
  );
}

export default function Brand({ compact = false }) {
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="Curbquote home">
        <img
          className="logo-wide"
          src="/logo-wide.png"
          alt=""
          width="506"
          height="96"
          decoding="async"
        />
        <Mark />
        <span className="wordmark">Curbquote</span>
      </Link>
      {!compact && <span className="chip">Not a painting company</span>}
    </header>
  );
}
