'use client';
export const dynamic = 'force-dynamic';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@must-iq-web/store/auth.store';
import { authApi } from '@must-iq-web/lib/api/auth';
import { MustLogo, IconLock, IconCheck, IconMail, IconEye, IconEyeOff, IconAlertTriangle, IconBuilding } from '@must-iq-web/components/ui/MustIcons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const { setAuth } = useAuthStore();
  const router = useRouter();

  async function handleSignIn() {
    setError(''); setEmailErr(''); setPassErr('');
    if (!email.includes('@')) { setEmailErr('Please enter a valid work email'); return; }
    if (password.length < 3) { setPassErr('Password required'); return; }

    setLoading(true);
    try {
      const { user, accessToken } = await authApi.login(email, password);

      setAuth({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamIds: user.teamIds,
        teamNames: user.teamNames || ['General'],
        initials: user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U',
        tokenLimit: 1000,
        deepSearchEnabled: false
      }, accessToken);

      // Set cookies so the middleware can authenticate protected routes
      const maxAge = 60 * 60 * 24 * 7; // 7 days
      document.cookie = `must-iq-token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `must-iq-role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;

      setSuccess(true);
      setTimeout(() => {
        if (user.mustChangePassword) {
          router.push('/change-password');
        } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
          router.push('/admin');
        } else {
          router.push('/chat');
        }
      }, 2200);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid email or password. Please try again.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  }

  return (

    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

      {/* Animated BG */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="bg-dots" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(var(--primary-rgb),0.06) 0%,transparent 70%)', top: -150, left: -100, animation: 'drift1 12s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(157,111,255,0.05) 0%,transparent 70%)', bottom: -100, right: -80, animation: 'drift2 10s ease-in-out infinite alternate' }} />
      </div>

      {/* Page */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 20px', animation: 'fadeUp 0.4s ease' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, border: '1.5px solid var(--primary)', background: 'rgba(var(--primary-rgb),0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 24, color: 'var(--primary)', boxShadow: '0 0 30px rgba(var(--primary-rgb),0.12)' }}>
              <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="2" width="4" height="20" fill="var(--ink)" />
                <rect x="10" y="2" width="4" height="20" fill="var(--ink)" />
                <rect x="17" y="2" width="4" height="20" fill="var(--primary)" />
              </svg>
            </div>
            <div style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 26, color: 'var(--ink)' }}>must<span style={{ color: 'var(--primary)' }}>-iq</span></div>
          </Link>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Must Company Internal AI Platform</div>
        </div>

        {/* Card */}
        <div className="card-line" style={{ position: 'relative', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', boxShadow: '0 24px 60px var(--color-shadow-card, rgba(0,0,0,0.1))' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 24 }}>Sign in to access your knowledge base</div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 18, background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)', color: '#ff8099', fontSize: 12.5, display: 'flex', gap: 10 }}>
              ⚠ {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Work Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.5 }}>✉</span>
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); if (emailErr) setEmailErr(''); }}
                placeholder="you@mustcompany.com"
                style={{ width: '100%', padding: '11px 12px 11px 36px', background: 'var(--surface)', border: `1px solid ${emailErr ? 'rgba(255,51,102,0.8)' : 'var(--border-2)'}`, borderRadius: 9, color: 'var(--ink)', fontSize: 14, fontFamily: 'Geist,system-ui,sans-serif', outline: 'none', boxSizing: 'border-box', boxShadow: emailErr ? '0 0 0 2px rgba(255,51,102,0.12)' : undefined }}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              />
            </div>
            {emailErr && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 5, fontWeight: 500 }}>{emailErr}</div>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                <IconLock size={14} />
              </span>
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); if (passErr) setPassErr(''); }}
                placeholder="Enter your password"
                style={{ width: '100%', padding: '11px 36px 11px 36px', background: 'var(--surface)', border: `1px solid ${passErr ? 'rgba(255,51,102,0.8)' : 'var(--border-2)'}`, borderRadius: 9, color: 'var(--ink)', fontSize: 14, fontFamily: 'Geist,system-ui,sans-serif', outline: 'none', boxSizing: 'border-box', boxShadow: passErr ? '0 0 0 2px rgba(255,51,102,0.12)' : undefined }}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              />
              <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--ink)' }}>👁</button>
            </div>
            {passErr && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 5, fontWeight: 500 }}>{passErr}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--primary)', opacity: 0.7, textDecoration: 'none' }}>Forgot password?</Link>
          </div>

          {/* Submit */}
          <button
            onClick={handleSignIn} disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'var(--primary)', border: 'none', borderRadius: 9, color: 'var(--bg)', fontSize: 14, fontWeight: 600, fontFamily: 'Geist,system-ui,sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, position: 'relative' }}
          >
            {loading ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(5,8,15,0.3)', borderTopColor: 'var(--bg)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle' }} /> : 'Sign in'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', fontSize: 11.5, color: 'var(--muted)' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />or continue with<div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button style={{ width: '100%', padding: '11px 12px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 9, color: 'var(--ink)', fontSize: 13.5, fontFamily: 'Geist,system-ui,sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            🏢 Sign in with Must Company SSO
          </button>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 16 }}>
            {[['var(--green)', 'Zero data egress'], ['var(--primary)', 'End-to-end encrypted'], ['var(--amber)', 'SOC 2 compliant']].map(([c, t]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--muted)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}` }} />{t}
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--muted)' }}>
          Need access? <a href="mailto:platform@mustcompany.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Contact the platform team</a>
        </div>
      </div>

      {/* Success overlay */}
      {success && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.3s ease' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,157,0.1)', border: '1.5px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0,255,157,0.2)' }}>
            <IconCheck size={28} color="var(--green)" />
          </div>
          <div style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 20, color: 'var(--ink)' }}>Welcome back</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Redirecting to your workspace…</div>
        </div>
      )}
    </div>
  );
}
