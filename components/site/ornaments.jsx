/**
 * Decorative SVG marks used across the site. All are `aria-hidden` — they
 * carry mood, never meaning, so screen readers skip them entirely.
 */

export function MandalaMark({ className = "", strokeWidth = 1 }) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.35" />
      <circle cx="100" cy="100" r="74" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.5" />
      <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.7" />
      <circle cx="100" cy="100" r="10" fill="currentColor" opacity="0.5" />
      {petals.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 100 100)`}>
          <path
            d="M100 30 C 116 52, 116 76, 100 96 C 84 76, 84 52, 100 30 Z"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            opacity="0.55"
          />
          <circle cx="100" cy="18" r="2.5" fill="currentColor" opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

export function LotusMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 6c4 6 6 12 6 18 0 4-1 8-6 12-5-4-6-8-6-12 0-6 2-12 6-18Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M32 36c-6-2-12-7-15-14 5-1 11 1 15 6 4-5 10-7 15-6-3 7-9 12-15 14Z"
        fill="currentColor"
        opacity="0.65"
      />
      <path
        d="M32 36C22 35 12 30 6 22c7-2 15 0 20 6 1-4 3-8 6-11 3 3 5 7 6 11 5-6 13-8 20-6-6 8-16 13-26 14Z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );
}

/** Repeating temple-arch silhouette used as a section divider. */
export function ArchBand({ className = "" }) {
  return (
    <div
      className={`yatra-arch-band h-3 w-full opacity-80 ${className}`}
      aria-hidden="true"
    />
  );
}

export function FlutePeacockMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 30c8-1 16-5 22-11 3-3 6-7 8-11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M10 34c9-1 18-6 24-13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <ellipse cx="34" cy="12" rx="6" ry="8" stroke="currentColor" strokeWidth="1.8" opacity="0.8" />
      <ellipse cx="34" cy="12" rx="2.4" ry="3.4" fill="currentColor" opacity="0.85" />
      <circle cx="14" cy="29" r="1.4" fill="currentColor" />
      <circle cx="20" cy="26" r="1.4" fill="currentColor" />
      <circle cx="26" cy="22" r="1.4" fill="currentColor" />
    </svg>
  );
}
