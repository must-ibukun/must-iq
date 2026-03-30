// ============================================================
// API Gateway — Entry Point (Restarted)
// NestJS with Helmet, CORS, JWT auth, rate limiting
// ============================================================

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { PrismaExceptionFilter } from "./common/filters/prisma.filter";
import { corsConfig } from "./common/config/cors.config";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS — allowed origins defined in common/config/cors.config.ts
  app.enableCors(corsConfig);

  // Auto-validate all DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );

  // Global Prisma Error Filter
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Global prefix
  app.setGlobalPrefix("api/v1");

  const port = process.env.PORT  || 4000;
  await app.listen(port);
  console.log(`🚀 API Gateway running on http://localhost:${port}/api/v1`);
}

bootstrap();
