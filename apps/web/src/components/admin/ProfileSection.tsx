'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@must-iq-web/store/auth.store';
import { authApi } from '@must-iq-web/lib/api/auth';
import { getTeams } from '@must-iq-web/lib/api/admin/teams';
import { Button, FormField, Toggle } from '@must-iq-web/components/ui';
import { IconCheck, IconX } from '@must-iq-web/components/ui/MustIcons';

interface Errors {
    name?: string;
    oldPassword?: string;
    newPassword?: string;
}

export function ProfileSection({ onBack }: { onBack?: () => void }) {
    const { user, setUser } = useAuthStore();

    const [name, setName] = useState(user?.name || '');
    const [deepSearchEnabled, setDeepSearchEnabled] = useState(user?.deepSearchEnabled || false);
    const [teamIds, setTeamIds] = useState<string[]>(user?.teamIds || []);
    const [availableTeams, setAvailableTeams] = useState<any[]>([]);
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
    const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });
    const [profileErrors, setProfileErrors] = useState<Pick<Errors, 'name'>>({});
    const [pwdErrors, setPwdErrors] = useState<Pick<Errors, 'oldPassword' | 'newPassword'>>({});

    useEffect(() => {
        if (user) {
            setName(user.name);
            setDeepSearchEnabled(user.deepSearchEnabled || false);
            setTeamIds(user.teamIds || []);
        }
        getTeams().then(res => setAvailableTeams(res.data)).catch(() => {});
    }, [user]);

    const handleTeamToggle = (id: string) => {
        setTeamIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const validateProfile = () => {
        const errs: typeof profileErrors = {};
        if (!name.trim()) errs.name = 'Name is required';
        setProfileErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validatePassword = () => {
        const errs: typeof pwdErrors = {};
        if (!oldPassword) errs.oldPassword = 'Please enter your current password';
        if (!newPassword) errs.newPassword = 'Please enter a new password';
        else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
        setPwdErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateProfile()) return;
        setSavingProfile(true);
        setProfileMsg({ text: '', type: '' });
        try {
            const updatedUser = await authApi.updateProfile({ name, deepSearchEnabled, teamIds });
            setUser({ ...user, ...updatedUser });
            setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
            setTimeout(() => setProfileMsg({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setProfileMsg({ text: err.response?.data?.message || 'Failed to update profile', type: 'error' });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePassword()) return;
        setSavingPassword(true);
        setPwdMsg({ text: '', type: '' });
        try {
            await authApi.changePassword({ oldPassword, newPassword });
            setOldPassword('');
            setNewPassword('');
            setPwdMsg({ text: 'Password changed successfully!', type: 'success' });
            setTimeout(() => setPwdMsg({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setPwdMsg({ text: err.response?.data?.message || 'Failed to change password', type: 'error' });
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-['DM_Serif_Display'] mb-1">User Profile</h1>
                    <p className="text-[13px] text-[var(--muted)]">Manage your account details and security settings directly within the dashboard.</p>
                </div>
                {onBack && (
                     <button
                     onClick={onBack}
                     className="px-3 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 border-0 cursor-pointer"
                     style={{
                         background: 'rgba(var(--primary-rgb),0.1)',
                         color: 'var(--primary)',
                         fontSize: 13,
                         fontWeight: 500,
                     }}
                 >
                     ← Back
                 </button>
                )}
            </div>

            {/* Profile Details */}
            <section className="p-6 rounded-2xl shadow-sm border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <h2 className="text-[14px] font-semibold mb-5 uppercase tracking-wider opacity-60 font-['DM_Mono',monospace]">
                    Personal Information
                </h2>
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6" noValidate>
                    <div className="flex gap-4">
                        <FormField
                            label="Name"
                            className="flex-1"
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); if (profileErrors.name) setProfileErrors({}); }}
                            error={profileErrors.name}
                            required
                        />
                        <div className="flex-1 flex flex-col gap-1.5 opacity-60">
                            <label className="text-[11.5px] font-semibold tracking-[0.05em] uppercase ml-0.5" style={{ color: 'var(--muted)' }}>Email (Read-only)</label>
                            <FormField label="" value={user?.email || ''} readOnly />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[11.5px] font-semibold tracking-[0.05em] uppercase ml-0.5" style={{ color: 'var(--muted)' }}>My Teams</label>
                        <div className="flex flex-wrap gap-2 p-4 rounded-xl border min-h-[60px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                            {availableTeams.length === 0 && <div className="text-[12px] opacity-40 py-1">No teams available...</div>}
                            {availableTeams.map(team => {
                                const selected = teamIds.includes(team.id);
                                return (
                                    <div 
                                        key={team.id}
                                        onClick={() => handleTeamToggle(team.id)}
                                        className={`px-3 py-1.5 rounded-lg border text-[12px] cursor-pointer transition-all flex items-center gap-2 ${selected ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-black/5 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        {selected && <IconCheck size={10} />}
                                        {team.name}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="flex-1">
                            <h4 className="text-[14px] font-semibold">Deep Search Default</h4>
                            <p className="text-[12px] text-[var(--muted)]">Always start new chats with agentic reasoning enabled.</p>
                        </div>
                        <Toggle 
                            on={deepSearchEnabled} 
                            onToggle={() => setDeepSearchEnabled(!deepSearchEnabled)} 
                        />
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="text-[13px]">
                            {profileMsg.text && (
                                <span style={{ color: profileMsg.type === 'error' ? 'var(--red)' : 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {profileMsg.type === 'success' ? <IconCheck size={12} /> : <IconX size={12} />}{profileMsg.text}
                                </span>
                            )}
                        </div>
                        <Button type="submit" variant="primary" isLoading={savingProfile}>
                            Save Profile
                        </Button>
                    </div>
                </form>
            </section>

            {/* Change Password */}
            <section className="p-6 rounded-2xl shadow-sm border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <h2 className="text-[14px] font-semibold mb-5 uppercase tracking-wider opacity-60 font-['DM_Mono',monospace]">
                    Security
                </h2>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-5" noValidate>
                    <div className="max-w-sm">
                        <FormField
                            label="Current Password"
                            type="password"
                            value={oldPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setOldPassword(e.target.value); if (pwdErrors.oldPassword) setPwdErrors(p => ({ ...p, oldPassword: undefined })); }}
                            error={pwdErrors.oldPassword}
                            required
                        />
                    </div>
                    <div className="max-w-sm">
                        <FormField
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNewPassword(e.target.value); if (pwdErrors.newPassword) setPwdErrors(p => ({ ...p, newPassword: undefined })); }}
                            error={pwdErrors.newPassword}
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="text-[13px]">
                            {pwdMsg.text && (
                                <span style={{ color: pwdMsg.type === 'error' ? 'var(--red)' : 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {pwdMsg.type === 'success' ? <IconCheck size={12} /> : <IconX size={12} />}{pwdMsg.text}
                                </span>
                            )}
                        </div>
                        <Button type="submit" variant="primary" isLoading={savingPassword}>
                            Change Password
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
}
