'use client';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@must-iq-web/components/auth';

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[var(--bg)] text-[var(--ink)]">
            <div className="w-full max-w-sm p-8 rounded-2xl bg-[var(--surface)] shadow-sm border border-[var(--border)]">
                <div className="mb-8 text-center">
                    <div className="text-2xl font-[family-name:var(--font-heading)] mb-2" style={{ color: 'var(--ink)' }}>
                        must<span style={{ color: 'var(--primary)' }}>-iq</span>
                    </div>
                    <h1 className="text-xl font-medium tracking-tight mt-4">Create new password</h1>
                    <p className="text-[13px] text-[var(--muted)] mt-1 tracking-tight">
                        Please enter your new password below.
                    </p>
                </div>
                <Suspense fallback={<div className="text-center text-[var(--muted)] text-[13px]">Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
