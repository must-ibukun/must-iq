'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, FormField } from '@must-iq-web/components/ui';
import { authApi } from '@must-iq-web/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [emailErr, setEmailErr] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const validate = () => {
        let ok = true;
        if (!email) { setEmailErr('Please enter your work email'); ok = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr('Please enter a valid work email'); ok = false; }
        else setEmailErr('');
        return ok;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        setError('');
        try {
            await authApi.forgotPassword(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[var(--bg)] text-[var(--ink)]">
            <div className="w-full max-w-sm p-8 rounded-2xl bg-[var(--surface)] shadow-sm border border-[var(--border)]">
                <div className="mb-8 text-center">
                    <div className="text-2xl font-[family-name:var(--font-heading)] mb-2" style={{ color: 'var(--ink)' }}>
                        must<span style={{ color: 'var(--primary)' }}>-iq</span>
                    </div>
                    <h1 className="text-xl font-medium tracking-tight mt-4">Reset your password</h1>
                    <p className="text-[13px] text-[var(--muted)] mt-1 tracking-tight">
                        We'll send you a link to securely reset it.
                    </p>
                </div>

                {success ? (
                    <div className="text-center">
                        <div className="p-4 rounded-xl mb-6 bg-[rgba(0,255,157,0.1)] text-[var(--green)] border border-[rgba(0,255,157,0.2)] text-[13px]">
                            If an account exists for <strong>{email}</strong>, a password reset link has been sent.
                        </div>
                        <Button variant="ghost" className="w-full" onClick={() => router.push('/login')}>
                            Return to login
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                        {error && (
                            <div className="p-3 rounded-lg text-[13px] bg-[rgba(255,51,102,0.1)] text-[var(--red)] border border-[rgba(255,51,102,0.2)]">
                                {error}
                            </div>
                        )}

                        <FormField
                            label="Work Email"
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); if (emailErr) setEmailErr(''); }}
                            error={emailErr}
                            required
                        />

                        <Button type="submit" variant="primary" className="w-full h-10 mt-1" isLoading={isLoading}>
                            Send reset link
                        </Button>

                        <div className="text-center mt-2">
                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="text-[13px] text-[var(--muted)] hover:text-[var(--primary)] transition-colors border-0 bg-transparent cursor-pointer"
                            >
                                Back to login
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
