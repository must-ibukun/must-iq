import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { TemplateService } from './template.service';

@Global()
@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
                    port: configService.get<number>('SMTP_PORT', 587),
                    secure: false,
                    auth: {
                        user: configService.get<string>('SMTP_USER'),
                        pass: configService.get<string>('SMTP_PASSWORD'),
                    },
                },
                defaults: {
                    from: `Must-IQ <${configService.get<string>('SMTP_FROM_EMAIL', 'noreply@mustiq.com')}>`,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [MailService, TemplateService],
    exports: [MailService],
})
export class NotificationModule {}
