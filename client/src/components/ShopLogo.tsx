/** Shopping bag mark used beside the word "Shop" everywhere. */
export function ShopLogo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0b1f35" />
      <path
        d="M22 26V20a10 10 0 0 1 20 0v6h6v24a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V26h6Zm15 0V20a7 7 0 0 0-14 0v6h14Z"
        fill="#c9a227"
      />
      <path
        d="M24 34v8M32 34v8M40 34v8"
        stroke="#0b1f35"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}