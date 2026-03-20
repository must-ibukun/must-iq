'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, FormField } from '@must-iq-web/components/ui';
import { authApi } from '@must-iq-web/lib/api';

export function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams?.get('token');

    const validate = () => {
        const errs: typeof errors = {};
        if (!password) errs.password = 'Please enter a new password';
        else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
        if (!confirmPassword) errs.confirm = 'Please confirm your password';
        else if (password !== confirmPassword) errs.confirm = 'Passwords do not match';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!token) { setApiError('Invalid or missing reset token.'); return; }
        setIsLoading(true);
        setApiError('');
        try {
            await authApi.resetPassword({ token, newPassword: password });
            router.push('/login?reset=success');
        } catch (err: any) {
            setApiError(err.response?.data?.message || 'Failed to reset password. The link might be expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {apiError && (
                <div className="p-3 rounded-lg text-[13px] bg-[rgba(255,51,102,0.1)] text-[var(--red)] border border-[rgba(255,51,102,0.2)]">
                    {apiError}
                </div>
            )}

            <FormField
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                error={errors.password}
                required
            />

            <FormField
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setConfirmPassword(e.target.value); if (errors.confirm) setErrors(p => ({ ...p, confirm: undefined })); }}
                error={errors.confirm}
                required
            />

            <Button type="submit" variant="primary" className="w-full h-10 mt-1" isLoading={isLoading}>
                Reset password
            </Button>

            <div className="text-center mt-2">
                <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-[13px] text-[var(--muted)] hover:text-[var(--primary)] transition-colors border-0 bg-transparent cursor-pointer"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
