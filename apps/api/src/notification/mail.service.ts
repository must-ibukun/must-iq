import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { TemplateService } from './template.service';
import { getSystemSettings } from '@must-iq/config';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(
        private readonly mailerService: MailerService,
        private readonly templateService: TemplateService,
        private readonly configService: ConfigService,
    ) { }

    async sendEmail(data: {
        to: string;
        subject: string;
        template: string;
        context?: Record<string, any>;
    }): Promise<void> {
        try {
            const html = await this.templateService.renderTemplate(data.template, data.context);

            const settings = await getSystemSettings();

            if (settings.emailProvider === 'api') {
                await this.sendViaApi({
                    to: data.to,
                    subject: data.subject,
                    html
                });
            } else {
                await this.mailerService.sendMail({ to: data.to, subject: data.subject, html });
            }
            this.logger.log(`Email "${data.subject}" sent to ${data.to}`);
        } catch (err: any) {
            this.logger.error(`Failed to send email to ${data.to}: ${err?.message}`);
            throw err;
        }
    }

    async sendViaApi(data: { to: string; subject: string; html: string }): Promise<void> {
        const url = this.configService.get<string>('PROVIDER_URL') || process.env.PROVIDER_URL;
        const apiKey = this.configService.get<string>('PROVIDER_API_KEY') || process.env.PROVIDER_API_KEY;
        const from = this.configService.get<string>('SMTP_FROM_EMAIL', 'admin@libertychristiancentre.online');

        if (!url || !apiKey) {
            throw new Error("Email API configuration missing (PROVIDER_URL or PROVIDER_API_KEY)");
        }

        const payload = {
            from: `Must-IQ <${from}>`,
            to: [data.to],
            subject: data.subject,
            html: data.html
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        try {
            const response = await axios.post(url, payload, { headers });
            this.logger.debug(`API Email sent response: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`Email send error via API: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }

    async sendUserInvite(to: string, name: string, email: string, tempPassword: string, loginUrl: string): Promise<void> {
        await this.sendEmail({
            to,
            subject: 'You have been invited to Must-IQ',
            template: 'user-invite',
            context: { name, email, tempPassword, loginUrl },
        });
    }

    async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
        await this.sendEmail({
            to,
            subject: 'Reset your Must-IQ password',
            template: 'password-reset',
            context: { name, resetUrl },
        });
    }
}
