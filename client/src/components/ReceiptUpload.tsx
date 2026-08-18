import { useRef, useState } from 'react';
import { validateReceiptFile, resolveMediaUrl } from '../utils/format';

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  paymentRef: string;
  onPaymentRefChange: (ref: string) => void;
}

export function ReceiptUpload({ file, onFileChange, paymentRef, onPaymentRefChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;
    const validation = validateReceiptFile(selected);
    if (validation) {
      setError(validation);
      onFileChange(null);
      e.target.value = '';
      return;
    }
    setError(null);
    onFileChange(selected);
  }

  function clearFile() {
    onFileChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const previewUrl = file ? resolveMediaUrl(URL.createObjectURL(file)) : '';

  return (
    <div className="card p-5">
      <h3 className="text-base font-bold text-slate-800">Payment Proof</h3>
      <p className="mt-0.5 text-sm text-slate-500">
        Upload your transfer receipt or screenshot (JPG, PNG, WEBP or PDF · max 5 MB).
      </p>

      <div className="mt-4 space-y-4">
        {/* Payment reference */}
        <div>
          <label htmlFor="paymentRef" className="label">
            Payment Reference / Transaction ID <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="paymentRef"
            type="text"
            value={paymentRef}
            onChange={(e) => onPaymentRefChange(e.target.value)}
            placeholder="e.g. GTB/2026/0123456789 or bank app reference"
            className="input"
            maxLength={200}
          />
        </div>

        {/* File input */}
        <div>
          <input
            ref={inputRef}
            id="receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 16V4m0 0 4 4m-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" />
            </svg>
            {file ? 'Change file' : 'Upload Receipt / Transfer Screenshot'}
          </button>

          {error && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          {file && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              {file.type === 'application/pdf' ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-red-100 text-xs font-bold text-red-700">
                  PDF
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="h-14 w-14 shrink-0 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                aria-label="Remove receipt"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}