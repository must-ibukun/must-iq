// ============================================================
// API Gateway — Entry Point (Restarted)
// NestJS with Helmet, CORS, JWT auth, rate limiting
// ============================================================

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { PrismaExceptionFilter } from "./common/filters/prisma.filter";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS — only allow internal frontend
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  // Auto-validate all DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );

  // Global Prisma Error Filter
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Global prefix
  app.setGlobalPrefix("api/v1");

  const port = process.env.PORT_API ?? 4000;
  await app.listen(port);
  console.log(`🚀 API Gateway running on http://localhost:${port}/api/v1`);
}

bootstrap();
