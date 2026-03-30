import {
    Injectable, UnauthorizedException,
    NotFoundException, BadRequestException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@must-iq/db';
import { compare, hash } from 'bcrypt';
import { JWTPayload } from '@must-iq/shared-types';
import * as crypto from 'crypto';
import { MailService } from '../notification/mail.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
    ) { }

    // ── Login ─────────────────────────────────────────────────────
    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { teams: true }
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
            sub: user.id,
            email: user.email,
            role: user.role as JWTPayload['role'],
            teamIds: user.teams.map(t => t.id),
            teamNames: user.teams.map(t => t.name),
        };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_SECRET || 'fallback_secret_for_dev',
            expiresIn: '7d',
        });

        const initials = user.name
            ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

        return {
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                teamIds: user.teams.map(t => t.id),
                teamNames: user.teams.map(t => t.name),
                initials,
                deepSearchEnabled: user.deepSearchEnabled,
                tokenLimit: user.role === 'ADMIN' ? -1 : (user.tokenBudgetOverride ?? 20000),
                mustChangePassword: user.mustChangePassword,
            },
        };
    }

    // ── Get profile ───────────────────────────────────────────────
    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { teams: true },
        });
        if (!user) throw new NotFoundException('User not found');
        
        const initials = user.name
            ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            teamIds: user.teams.map(t => t.id),
            teamNames: user.teams.map(t => t.name),
            initials,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
            deepSearchEnabled: user.deepSearchEnabled,
            tokenLimit: user.role === 'ADMIN' ? -1 : (user.tokenBudgetOverride ?? 20000),
        };
    }

    // ── Update profile ────────────────────────────────────────────
    async updateProfile(userId: string, data: { name?: string; teamIds?: string[]; deepSearchEnabled?: boolean }) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.name && { name: data.name.trim() }),
                ...(data.teamIds && { teams: { set: data.teamIds.map(id => ({ id })) } }),
                ...(data.deepSearchEnabled !== undefined && { deepSearchEnabled: data.deepSearchEnabled }),
            },
            include: { teams: true },
        });

        const initials = user.name
            ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            teamIds: user.teams.map(t => t.id),
            teamNames: user.teams.map(t => t.name),
            initials,
            isActive: user.isActive,
            createdAt: user.createdAt,
            deepSearchEnabled: user.deepSearchEnabled,
            tokenLimit: user.role === 'ADMIN' ? -1 : (user.tokenBudgetOverride ?? 20000),
        };
    }

    // ── Change password ───────────────────────────────────────────
    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const valid = await compare(oldPassword, user.passwordHash);
        if (!valid) throw new UnauthorizedException('Current password is incorrect');

        if (newPassword.length < 8) {
            throw new BadRequestException('New password must be at least 8 characters');
        }

        const passwordHash = await hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
        return { message: 'Password updated successfully' };
    }

    // ── Forgot password ───────────────────────────────────────────
    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        // Always same message to prevent email enumeration
        if (!user) return { message: 'If that email exists, a reset link has been sent' };

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await this.prisma.refreshToken.create({
            data: { token, userId: user.id, expiresAt },
        });

        const resetUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        try {
            await this.mailService.sendPasswordReset(email, user.name, resetUrl);
        } catch {
            this.logger.warn(`Password reset email failed for ${email} — token created but email not sent`);
        }

        return { message: 'If that email exists, a reset link has been sent' };
    }

    // ── Reset password ────────────────────────────────────────────
    async resetPassword(token: string, newPassword: string) {
        if (newPassword.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        const record = await this.prisma.refreshToken.findUnique({ where: { token } });

        if (!record || record.expiresAt < new Date()) {
            throw new BadRequestException('Reset link is invalid or has expired');
        }

        const passwordHash = await hash(newPassword, 10);
        await Promise.all([
            this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
            this.prisma.refreshToken.delete({ where: { token } }),
        ]);

        return { message: 'Password reset successfully. You can now log in.' };
    }
}
