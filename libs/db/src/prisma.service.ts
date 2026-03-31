import 'dotenv/config';
import {
    INestApplication,
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { PrismaClient } from './generated-client';
import { ExtendedModelMethods, ExtendedPrismaModels } from './types';

@Injectable()
class BasePrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BasePrismaService.name);

    constructor() {
        let finalUrl = process.env.DATABASE_URL;
        if (finalUrl && !finalUrl.includes('connection_limit')) {
            finalUrl = finalUrl.includes('?')
                ? `${finalUrl}&connection_limit=3`
                : `${finalUrl}?connection_limit=3`;
        }

        super({
            datasources: {
                db: { url: finalUrl },
            },
        });

        this.extendModels();
    }

    private extendModels() {
        // No soft-delete query filtering here because must-iq models
        // do not have a `deletedAt` field natively yet.
        // If soft-delete is needed in the future, add it to this `$extends` block.
        const extendedClient = this.$extends({});

        (this as any)._extendedClient = extendedClient;

        const modelNames = Object.keys(this).filter(
            (key) => typeof (this as any)[key]?.findMany === 'function',
        );

        for (const modelName of modelNames) {
            const originalModel = (this as any)[modelName];
            const extendedModel = (extendedClient as any)[modelName];

            const originalDelete = originalModel.delete.bind(originalModel);
            const originalDeleteMany = originalModel.deleteMany.bind(originalModel);

            Object.assign(extendedModel, {
                hardDeleteOne: async (args: any) => {
                    return originalDelete(args);
                },
                hardDeleteMany: async (args: any) => {
                    return originalDeleteMany(args);
                },
                restoreOne: async (args: any) => {
                    return originalModel.update({
                        where: args.where,
                        data: { deletedAt: null },
                    });
                },
                findIncludingDeleted: async (args: any) => {
                    return originalModel.findUnique(args);
                },
                findManyIncludingDeleted: async (args: any) => {
                    return originalModel.findMany(args);
                },
            });
        }
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Connected to the database');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Disconnected from the database');
    }

    async enableShutdownHooks(app: INestApplication) {
        process.on('beforeExit', async () => {
            await app.close();
        });
    }
}

const ExtendedPrismaServiceProxy = new Proxy(BasePrismaService, {
    construct(target) {
        const instance = new target();

        return new Proxy(instance, {
            get(target, prop) {
                const value = (target as any)[prop];

                if (
                    value &&
                    typeof value === 'object' &&
                    typeof value.findMany === 'function'
                ) {
                    const extendedClient = (target as any)._extendedClient;
                    if (extendedClient?.[prop]) {
                        return extendedClient[prop];
                    }
                    return value;
                }

                return value;
            },
        });
    },
});

export const PrismaService = ExtendedPrismaServiceProxy;
export type PrismaService = BasePrismaService & ExtendedPrismaModels;
// Non-NestJS singleton export for scripts
export const prisma = new (BasePrismaService as any)() as BasePrismaService & ExtendedPrismaModels;
