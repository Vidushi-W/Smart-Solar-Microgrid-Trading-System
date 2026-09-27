export default function SunMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="13" fill="#e39a24" />
      <g stroke="#e39a24" strokeWidth="3" strokeLinecap="round">
        <path d="M32 7v7M32 50v7M7 32h7M50 32h7M14 14l5 5M45 45l5 5M50 14l-5 5M19 45l-5 5" />
      </g>
    </svg>
  );
}
