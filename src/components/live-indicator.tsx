export function LiveIndicator() {
  return (
    <div className="live-indicator" role="status" aria-label="Estamos en vivo">
      <svg
        aria-hidden="true"
        className="live-indicator-icon"
        viewBox="0 0 28 28"
        fill="none"
      >
        <path d="M8.6 8.6a7.65 7.65 0 0 0 0 10.8M19.4 8.6a7.65 7.65 0 0 1 0 10.8" />
        <path d="M5.1 5.1a12.6 12.6 0 0 0 0 17.8M22.9 5.1a12.6 12.6 0 0 1 0 17.8" />
        <circle className="live-indicator-dot" cx="14" cy="14" r="3.1" />
        <circle className="live-indicator-pulse" cx="14" cy="14" r="5.6" />
      </svg>
      <span>EN VIVO</span>
    </div>
  );
}
