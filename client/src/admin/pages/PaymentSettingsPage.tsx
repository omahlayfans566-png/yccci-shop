import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../api/adminApi';
import type { PaymentSettingsData } from '../types';

export function PaymentSettingsPage() {
    const [form, setForm] = useState<PaymentSettingsData>({
        bankName: '', accountName: '', accountNumber: '', instructions: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        adminApi.getPaymentSettings()
            .then((r) => setForm(r.paymentSettings))
            .catch((e) => setError(e.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);

    function set(k: keyof PaymentSettingsData, v: string) {
        setForm((f) => ({ ...f, [k]: v }));
        setError(''); setSuccess('');
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!form.bankName.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
            setError('Bank name, account name and account number are required.');
            return;
        }
        setSaving(true);
        try {
            await adminApi.updatePaymentSettings(form);
            setSuccess('Payment settings saved. The shop will show the updated details immediately.');
        } catch (e: any) {
            setError(e.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Payment Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Update the bank transfer details shown to customers at checkout.
                </p>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            {loading ? (
                <div className="flex justify-center py-12">
                    <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="card p-6 space-y-5">
                    <div>
                        <label className="label">Bank Name *</label>
                        <input type="text" className="input" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="e.g. GTBank" />
                    </div>
                    <div>
                        <label className="label">Account Name *</label>
                        <input type="text" className="input" value={form.accountName} onChange={(e) => set('accountName', e.target.value)} placeholder="e.g. SHOP Business Account" />
                    </div>
                    <div>
                        <label className="label">Account Number *</label>
                        <input type="text" className="input" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} placeholder="e.g. 0123456789" />
                    </div>
                    <div>
                        <label className="label">Payment Instructions</label>
                        <textarea rows={4} className="input" value={form.instructions || ''} onChange={(e) => set('instructions', e.target.value)}
                            placeholder="e.g. Transfer the exact amount and upload your receipt below." />
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
                        {saving ? 'Saving…' : 'Save Payment Settings'}
                    </button>
                </form>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>Note:</strong> These details are shown to all customers at checkout. Make sure they are correct before saving.
            </div>
        </div>
    );
}
