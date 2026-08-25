import { Link } from "react-router-dom";

export default function Brand({ compact = false }) {
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="Curbquote home">
        <svg className="mark" viewBox="0 0 36 36" aria-hidden="true">
          <rect width="36" height="36" rx="10" fill="#1F4A3A" />
          <path d="M7 20.5 18 11l11 9.5V27a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 7 27v-6.5Z" fill="#F3EDE3" />
          <rect x="15.5" y="20.5" width="5" height="8" rx="0.7" fill="#1F4A3A" />
        </svg>
        <div className="wordmark">
          Curb<span>quote</span>
        </div>
      </Link>
      {!compact && <span className="chip">Not a painting company</span>}
    </header>
  );
}
