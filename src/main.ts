import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { createLogger } from './common/utils/logger.util';

async function bootstrap() {
  const logger = createLogger();
  
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: logger,
    }),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('IVR Navigation Agent API')
    .setDescription('AI-powered agent for autonomous IVR navigation and call handling')
    .setVersion('1.0')
    .addTag('telephony', 'Telephony and call management endpoints')
    .addTag('ai-engine', 'AI and LLM integration endpoints')
    .addTag('ivr-navigator', 'IVR navigation and mapping endpoints')
    .addTag('scripts', 'Call script management endpoints')
    .addTag('calls', 'Call session management endpoints')
    .addServer(`http://localhost:${port}`, 'Development server')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.info(`Application is running on: http://localhost:${port}`);
  logger.info(`Swagger documentation available at: http://localhost:${port}/api`);
}

bootstrap();