import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { TemplateService } from './template.service';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(
        private readonly mailerService: MailerService,
        private readonly templateService: TemplateService,
    ) {}

    async sendEmail(data: {
        to: string;
        subject: string;
        template: string;
        context?: Record<string, any>;
    }): Promise<void> {
        try {
            const html = await this.templateService.renderTemplate(data.template, data.context);
            await this.mailerService.sendMail({ to: data.to, subject: data.subject, html });
            this.logger.log(`Email "${data.subject}" sent to ${data.to}`);
        } catch (err) {
            this.logger.error(`Failed to send email to ${data.to}: ${err?.message}`);
            throw err;
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
