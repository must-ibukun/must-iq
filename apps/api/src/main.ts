import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { PrismaExceptionFilter } from "./common/filters/prisma.filter";
import { corsConfig } from "./common/config/cors.config";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors(corsConfig);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix("api/v1");

  const port = process.env.PORT  || 4000;
  await app.listen(port);
  console.log(`🚀 API Gateway running on http://localhost:${port}/api/v1`);
}

bootstrap();
