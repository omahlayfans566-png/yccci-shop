import { useState, type FormEvent } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminApi';

export function ProfilePage() {
    const { admin } = useAdminAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(''); setSuccess('');
        if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
        if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
        setSaving(true);
        try {
            await adminApi.changePassword(currentPassword, newPassword);
            setSuccess('Password changed successfully.');
            setCurrentPassword(''); setNewPassword(''); setConfirm('');
        } catch (e: any) {
            setError(e.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <h1 className="text-2xl font-extrabold text-slate-900">My Profile</h1>

            <div className="card p-5">
                <dl className="space-y-3">
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt>
                        <dd className="text-sm font-semibold text-slate-800">{admin?.name}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
                        <dd className="text-sm text-slate-800">{admin?.email}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</dt>
                        <dd>
                            <span className="inline-flex rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-600">
                                {admin?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                            </span>
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="card p-5">
                <h2 className="mb-4 font-bold text-slate-800">Change Password</h2>
                {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                {success && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Current Password</label>
                        <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    </div>
                    <div>
                        <label className="label">New Password</label>
                        <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                        <label className="label">Confirm New Password</label>
                        <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
                        {saving ? 'Saving…' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
