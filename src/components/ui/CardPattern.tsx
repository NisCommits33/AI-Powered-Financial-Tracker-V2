interface CardPatternProps {
  className?: string;
  variant?: "rings" | "grid" | "waves" | "topo";
}

/**
 * Decorative SVG overlay used to give hero/account/summary cards a
 * "physical card" texture without needing external image assets.
 */
export function CardPattern({ className = "", variant = "rings" }: CardPatternProps) {
  if (variant === "grid") {
    return (
      <svg
        className={className}
        viewBox="0 0 200 200"
        preserveAspectRatio="xMaxYMin slice"
        aria-hidden="true"
      >
        <defs>
          <pattern id="cardGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 0 H20 V20" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#cardGrid)" />
      </svg>
    );
  }

  if (variant === "waves") {
    return (
      <svg
        className={className}
        viewBox="0 0 200 100"
        preserveAspectRatio="xMaxYMax slice"
        aria-hidden="true"
      >
        <path d="M0 70 Q 50 40 100 70 T 200 70 V100 H0 Z" fill="currentColor" opacity="0.5" />
        <path d="M0 85 Q 50 60 100 85 T 200 85 V100 H0 Z" fill="currentColor" opacity="0.7" />
      </svg>
    );
  }

  if (variant === "topo") {
    return (
      <svg
        className={className}
        viewBox="0 0 200 200"
        preserveAspectRatio="xMaxYMin meet"
        aria-hidden="true"
      >
        <path d="M-20 60 C 40 20, 100 100, 220 40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M-20 100 C 40 60, 100 140, 220 80" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <path d="M-20 140 C 40 100, 100 180, 220 120" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
        <path d="M-20 20 C 40 -20, 100 60, 220 0" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    );
  }

  // "rings" — overlapping circles in the top-right corner, evoking a card hologram.
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      preserveAspectRatio="xMaxYMin meet"
      aria-hidden="true"
    >
      <circle cx="180" cy="20" r="90" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="180" cy="20" r="60" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="180" cy="20" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}
