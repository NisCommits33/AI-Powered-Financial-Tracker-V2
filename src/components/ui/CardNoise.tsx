interface CardNoiseProps {
  className?: string;
}

/**
 * Subtle film-grain texture overlay for "physical card" surfaces.
 * Uses SVG feTurbulence so no image asset is needed.
 */
export function CardNoise({ className = "" }: CardNoiseProps) {
  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none">
      <filter id="cardNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#cardNoise)" />
    </svg>
  );
}
