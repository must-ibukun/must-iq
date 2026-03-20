import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@must-iq/db';

@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class DatabaseModule { }
