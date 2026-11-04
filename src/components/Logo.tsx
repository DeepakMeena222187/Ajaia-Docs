export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#2f5d3a" />
      <path d="M16 25 C 16 18, 16 14, 16 9" stroke="#dfe8d6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M16 17 C 10 17, 8 12, 9 8 C 13 8, 16 11, 16 17 Z" fill="#9fc79a" />
      <path d="M16 20 C 22 20, 24 15, 23 11 C 19 11, 16 14, 16 20 Z" fill="#dfe8d6" />
    </svg>
  );
}
