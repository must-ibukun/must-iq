import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

import { TokenModule } from '../token/token.module';

@Module({
    imports: [TokenModule],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule { }
