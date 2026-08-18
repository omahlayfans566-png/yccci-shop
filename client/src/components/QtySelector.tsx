interface Props {
  qty: number;
  min?: number;
  max?: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
}

export function QtySelector({ qty, min = 1, max = 99, onChange, disabled }: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-l-lg text-lg font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        onClick={() => onChange(clamp(qty - 1))}
        disabled={disabled || qty <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-semibold" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-r-lg text-lg font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        onClick={() => onChange(clamp(qty + 1))}
        disabled={disabled || qty >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}