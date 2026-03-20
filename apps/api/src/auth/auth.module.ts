import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET || 'fallback_secret_for_dev',
        }),
        DatabaseModule,
    ],
    controllers: [AuthController],
    providers: [AuthGuard, AuthService],
    exports: [AuthGuard, JwtModule],
})
export class AuthModule { }

