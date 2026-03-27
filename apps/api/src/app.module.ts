import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        AuthModule,
        ChatModule,
        SettingsModule,
        AdminModule,
        IntegrationsModule,
        IngestionModule,
    ],
})
export class AppModule { }
