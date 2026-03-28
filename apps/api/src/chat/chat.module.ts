import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatLogListener } from './listener/chat-log.listener';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [ChatController],
    providers: [ChatService, ChatLogListener],
})
export class ChatModule { }
