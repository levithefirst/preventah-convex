/**
 * The landing illustration.
 *
 * An original drawing in the product's own colours: mint shirt, blush
 * hair, ink line, cream skin and card. Inline SVG with CSS-only motion,
 * which is the whole point: a WebGL hero the night before judging is how
 * a site fails to load on a mid-range phone. It costs a few kilobytes
 * and no library.
 *
 * Decorative, so it is hidden from assistive technology entirely; the
 * headline beside it already says what the page is for.
 */
export default function Character() {
  return (
    <svg
      className="char"
      viewBox="0 0 260 280"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* Seat: an offset blush plate, same trick as every window */}
      <rect x="44" y="214" width="150" height="26" rx="10" fill="#E8B4B8" stroke="#141414" strokeWidth="4" />
      <rect x="38" y="206" width="150" height="26" rx="10" fill="#F6F1E8" stroke="#141414" strokeWidth="4" />

      {/* Legs */}
      <path d="M78 232 v26 h20 v-26" fill="#141414" />
      <path d="M132 232 v26 h20 v-26" fill="#141414" />

      <g className="charBody">
        {/* Torso */}
        <path
          d="M72 208 v-52 a46 46 0 0 1 92 0 v52 z"
          fill="#B7D9C2"
          stroke="#141414"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Collar */}
        <path d="M104 112 l14 16 l14 -16" fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round" />

        {/* Arm holding the card */}
        <path
          d="M158 168 q28 -6 34 -28"
          fill="none"
          stroke="#141414"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M158 168 q28 -6 34 -28"
          fill="none"
          stroke="#B7D9C2"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Head */}
        <circle cx="118" cy="82" r="38" fill="#F6F1E8" stroke="#141414" strokeWidth="4" />
        {/* Hair */}
        <path
          d="M80 78 a38 38 0 0 1 76 0 q-10 -16 -38 -16 t-38 16 z"
          fill="#E8B4B8"
          stroke="#141414"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Eyes, which blink */}
        <g className="charEyes">
          <circle cx="106" cy="86" r="4" fill="#141414" />
          <circle cx="132" cy="86" r="4" fill="#141414" />
        </g>
        {/* A small, calm smile */}
        <path d="M108 100 q10 8 20 0" fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* The card: a cream window with a mint check that pops once */}
      <g className="charCard">
        <rect x="188" y="104" width="62" height="54" rx="10" fill="#E8B4B8" stroke="#141414" strokeWidth="4" />
        <rect x="182" y="98" width="62" height="54" rx="10" fill="#F6F1E8" stroke="#141414" strokeWidth="4" />
        <path d="M182 116 h62" stroke="#141414" strokeWidth="4" />
        <path d="M182 108 a10 10 0 0 1 10 -10 h42 a10 10 0 0 1 10 10 v8 h-62 z" fill="#B7D9C2" />
        <path d="M182 116 h62" stroke="#141414" strokeWidth="4" />
        <path
          className="charCheck"
          d="M196 134 l10 10 l18 -20"
          fill="none"
          stroke="#141414"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
