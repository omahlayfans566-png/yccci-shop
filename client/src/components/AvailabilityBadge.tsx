import type { Availability } from '../types';

const styles: Record<Availability, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available', className: 'bg-emerald-100 text-emerald-700' },
  SOLD_OUT: { label: 'Sold Out', className: 'bg-red-100 text-red-700' },
  COMING_SOON: { label: 'Coming Soon', className: 'bg-amber-100 text-amber-700' },
};

export function AvailabilityBadge({ status }: { status: Availability }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function availabilityOf(status: Availability, stock: number): Availability {
  if (status === 'AVAILABLE' && stock > 0) return 'AVAILABLE';
  return status;
}