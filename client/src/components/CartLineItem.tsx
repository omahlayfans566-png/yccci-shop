import type { CartLine } from '../types';
import { formatMoney, resolveMediaUrl } from '../utils/format';
import { QtySelector } from './QtySelector';

interface Props {
  line: CartLine;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export function CartLineItem({ line, onIncrease, onDecrease, onRemove }: Props) {
  const max = line.stock > 0 ? line.stock : 99;
  return (
    <li className="flex gap-3 border-b border-slate-100 py-4 last:border-0">
      <img
        src={resolveMediaUrl(line.image)}
        alt={line.name}
        loading="lazy"
        className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{line.name}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {[line.size && `Size: ${line.size}`, line.colour && `Colour: ${line.colour}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove ${line.name}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <QtySelector qty={line.qty} max={max} onChange={(q) => (q > line.qty ? onIncrease() : q < line.qty ? onDecrease() : undefined)} />
          <span className="text-sm font-bold text-brand-800">{formatMoney(line.price * line.qty)}</span>
        </div>
      </div>
    </li>
  );
}