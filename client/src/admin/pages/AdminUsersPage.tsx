import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../api/adminApi';
import { useAdminAuth } from '../context/AdminAuthContext';
import type { AdminUser } from '../types';

export function AdminUsersPage() {
    const { admin: currentAdmin } = useAdminAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [showReset, setShowReset] = useState<AdminUser | null>(null);
    const [saving, setSaving] = useState(false);

    // Create form
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('admin');

    // Reset password form
    const [newPassword, setNewPassword] = useState('');

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

    function load() {
        setLoading(true);
        adminApi.listAdmins()
            .then((r) => setAdmins(r.admins))
            .catch((e) => setError(e.message || 'Failed to load admins'))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password) return;
        setSaving(true);
        try {
            await adminApi.createAdmin({ name: name.trim(), email: email.trim(), password, role });
            showToast('Admin account created.');
            setShowCreate(false);
            setName(''); setEmail(''); setPassword(''); setRole('admin');
            load();
        } catch (e: any) {
            showToast(e.message || 'Failed to create admin');
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleActive(admin: AdminUser) {
        try {
            await adminApi.updateAdmin(admin._id, { isActive: !admin.isActive });
            showToast(`Account ${admin.isActive ? 'disabled' : 'enabled'}.`);
            load();
        } catch (e: any) {
            showToast(e.message || 'Failed to update');
        }
    }

    async function handleDelete(admin: AdminUser) {
        if (!confirm(`Permanently delete admin "${admin.name}"? This cannot be undone.`)) return;
        try {
            await adminApi.deleteAdmin(admin._id);
            showToast('Admin deleted.');
            load();
        } catch (e: any) {
            showToast(e.message || 'Failed to delete');
        }
    }

    async function handleResetPassword(e: FormEvent) {
        e.preventDefault();
        if (!showReset || !newPassword || newPassword.length < 8) return;
        setSaving(true);
        try {
            await adminApi.resetAdminPassword(showReset._id, newPassword);
            showToast('Password reset successfully.');
            setShowReset(null);
            setNewPassword('');
        } catch (e: any) {
            showToast(e.message || 'Failed to reset password');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Admin Users</h1>
                    <p className="text-sm text-slate-500">{admins.length} admin accounts</p>
                </div>
                <button type="button" onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2.5 text-sm">
                    + Add Admin
                </button>
            </div>

            {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {loading ? (
                <div className="flex justify-center py-16">
                    <svg className="h-8 w-8 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </div>
            ) : (
                <>
                    {/* Desktop */}
                    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {admins.map((a) => (
                                    <tr key={a._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-800">{a.name}</p>
                                            {a._id === currentAdmin?._id && <span className="text-xs text-brand-500">(you)</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{a.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${a.role === 'superadmin' ? 'bg-accent-100 text-accent-600' : 'bg-brand-50 text-brand-700'}`}>
                                                {a.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {a.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {a._id !== currentAdmin?._id && (
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setShowReset(a)} className="btn-outline px-3 py-1.5 text-xs">Reset PW</button>
                                                    <button type="button" onClick={() => handleToggleActive(a)} className="btn-outline px-3 py-1.5 text-xs">
                                                        {a.isActive ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button type="button" onClick={() => handleDelete(a)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="grid gap-3 md:hidden">
                        {admins.map((a) => (
                            <div key={a._id} className="card p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{a.name} {a._id === currentAdmin?._id && <span className="text-xs text-brand-500">(you)</span>}</p>
                                        <p className="text-sm text-slate-500">{a.email}</p>
                                        <div className="mt-1 flex gap-2">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${a.role === 'superadmin' ? 'bg-accent-100 text-accent-600' : 'bg-brand-50 text-brand-700'}`}>
                                                {a.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {a.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {a._id !== currentAdmin?._id && (
                                    <div className="mt-3 flex gap-2">
                                        <button type="button" onClick={() => setShowReset(a)} className="btn-outline flex-1 py-2 text-sm">Reset PW</button>
                                        <button type="button" onClick={() => handleToggleActive(a)} className="btn-outline flex-1 py-2 text-sm">{a.isActive ? 'Disable' : 'Enable'}</button>
                                        <button type="button" onClick={() => handleDelete(a)} className="rounded-lg border border-red-200 bg-red-50 flex-1 py-2 text-sm font-semibold text-red-600">Delete</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="card w-full max-w-md p-6">
                        <h2 className="mb-4 text-lg font-bold text-slate-900">Add Admin Account</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="label">Full Name *</label>
                                <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                            </div>
                            <div>
                                <label className="label">Email *</label>
                                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Password * (min 8 characters)</label>
                                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Role</label>
                                <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1 py-2.5">Cancel</button>
                                <button type="submit" disabled={saving || !name.trim() || !email.trim() || password.length < 8} className="btn-primary flex-1 py-2.5">
                                    {saving ? 'Creating…' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset password modal */}
            {showReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="card w-full max-w-md p-6">
                        <h2 className="mb-1 text-lg font-bold text-slate-900">Reset Password</h2>
                        <p className="mb-4 text-sm text-slate-500">Resetting password for <strong>{showReset.name}</strong></p>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="label">New Password * (min 8 characters)</label>
                                <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowReset(null); setNewPassword(''); }} className="btn-outline flex-1 py-2.5">Cancel</button>
                                <button type="submit" disabled={saving || newPassword.length < 8} className="btn-primary flex-1 py-2.5">
                                    {saving ? 'Resetting…' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
