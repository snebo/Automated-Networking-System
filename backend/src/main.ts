import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { createLogger } from './common/utils/logger.util';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = createLogger();
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({
      instance: logger,
    }),
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS with specific configuration for production
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3000'];
  
  // In production, we need to handle Vercel preview URLs and the main domain
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      // Check if origin is in the allowed list
      if (corsOrigins.some(allowed => origin.startsWith(allowed))) {
        return callback(null, true);
      }
      
      // Allow all Vercel preview deployments
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      // Allow localhost for development
      if (origin.startsWith('http://localhost')) {
        return callback(null, true);
      }
      
      // Log rejected origins for debugging
      console.log('CORS rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  
  app.enableCors(corsOptions);

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