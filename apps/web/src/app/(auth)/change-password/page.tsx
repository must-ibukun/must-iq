'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@must-iq-web/store/auth.store';
import { authApi } from '@must-iq-web/lib/api/auth';
import Link from 'next/link';
import { IconKey } from '@must-iq-web/components/ui/MustIcons';


export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const { user, setUser } = useAuthStore();
    const router = useRouter();

    function validate() {
        const errs: Record<string, string> = {};
        if (!currentPassword) errs.current = 'Enter your temporary password';
        if (!newPassword || newPassword.length < 8) errs.new = 'New password must be at least 8 characters';
        if (newPassword !== confirmPassword) errs.confirm = 'Passwords do not match';
        if (newPassword === currentPassword) errs.new = 'New password must differ from the temporary one';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSubmit() {
        setError('');
        if (!validate()) return;
        setLoading(true);
        try {
            await authApi.changePassword({ oldPassword: currentPassword, newPassword });
            
            // Clear the force-change lock
            if (typeof document !== 'undefined') {
                document.cookie = 'must-iq-force-change=; path=/; max-age=0';
            }

            // Clear the flag locally so the user isn't redirected again
            if (user) setUser({ ...user, mustChangePassword: false });
            const role = user?.role;
            router.push(role === 'ADMIN' || role === 'MANAGER' ? '/admin' : '/chat');
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Failed to change password. Please try again.';
            setError(Array.isArray(msg) ? msg[0] : msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease' }}>

                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <div style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 26, color: 'var(--ink)' }}>
                            must<span style={{ color: 'var(--primary)' }}>-iq</span>
                        </div>
                    </Link>
                </div>

                {/* Card */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', boxShadow: '0 24px 60px var(--color-shadow-card, rgba(0,0,0,0.1))' }}>

                    {/* Header */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--primary-rgb),0.1)', border: '1px solid rgba(var(--primary-rgb),0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconKey size={16} color="var(--primary)" />
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Set your password</div>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                            Your account was set up with a temporary password. Please choose a permanent one to continue.
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 18, background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)', color: '#ff8099', fontSize: 12.5 }}>
                            ⚠ {error}
                        </div>
                    )}

                    {/* Current password */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Temporary Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={e => { setCurrentPassword(e.target.value); clearField('current'); }}
                            placeholder="Enter the password from your invite email"
                            style={inputStyle(!!fieldErrors.current)}
                        />
                        {fieldErrors.current && <div style={errStyle}>{fieldErrors.current}</div>}
                    </div>

                    {/* New password */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => { setNewPassword(e.target.value); clearField('new'); }}
                            placeholder="At least 8 characters"
                            style={inputStyle(!!fieldErrors.new)}
                        />
                        {fieldErrors.new && <div style={errStyle}>{fieldErrors.new}</div>}
                    </div>

                    {/* Confirm password */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={labelStyle}>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); clearField('confirm'); }}
                            placeholder="Repeat your new password"
                            style={inputStyle(!!fieldErrors.confirm)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                        {fieldErrors.confirm && <div style={errStyle}>{fieldErrors.confirm}</div>}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{ width: '100%', padding: '12px', background: 'var(--primary)', border: 'none', borderRadius: 9, color: 'var(--bg)', fontSize: 14, fontWeight: 600, fontFamily: 'Geist,system-ui,sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}
                    >
                        {loading
                            ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(5,8,15,0.3)', borderTopColor: 'var(--bg)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle' }} />
                            : 'Set Password & Continue →'}
                    </button>
                </div>
            </div>
        </div>
    );

    function clearField(key: string) {
        setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
    }
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.05em',
    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7,
};

const errStyle: React.CSSProperties = {
    fontSize: 12, color: 'var(--red)', marginTop: 5, fontWeight: 500,
};

function inputStyle(hasError: boolean): React.CSSProperties {
    return {
        width: '100%', padding: '11px 12px', background: 'var(--surface)',
        border: `1px solid ${hasError ? 'rgba(255,51,102,0.8)' : 'var(--border-2)'}`,
        borderRadius: 9, color: 'var(--ink)', fontSize: 14,
        fontFamily: 'Geist,system-ui,sans-serif', outline: 'none', boxSizing: 'border-box',
        boxShadow: hasError ? '0 0 0 2px rgba(255,51,102,0.12)' : undefined,
    };
}
