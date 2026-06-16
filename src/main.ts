import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // ── Global prefix ──────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation ─────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Exception filter ───────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── CORS ───────────────────────────────────────────────────────────
  const allowedOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Swagger ────────────────────────────────────────────────────────
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Superset Embed API')
      .setDescription('API quản lý dashboard và xác thực Superset Embedded')
      .setVersion('1.0')
      .addTag('Superset Auth')
      .addTag('Dashboards')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // ── Start ──────────────────────────────────────────────────────────
  const port = config.get<number>('PORT', 4044);
  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}/api`);

  if (config.get<string>('NODE_ENV') !== 'production') {
    console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  }
}

bootstrap().catch(console.error);
