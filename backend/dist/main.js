"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const nest_winston_1 = require("nest-winston");
const logger_util_1 = require("./common/utils/logger.util");
const path_1 = require("path");
async function bootstrap() {
    const logger = (0, logger_util_1.createLogger)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: nest_winston_1.WinstonModule.createLogger({
            instance: logger,
        }),
    });
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'));
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT', 3000);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3000'];
    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (corsOrigins.some(allowed => origin.startsWith(allowed))) {
                return callback(null, true);
            }
            if (origin.includes('.vercel.app')) {
                return callback(null, true);
            }
            if (origin.startsWith('http://localhost')) {
                return callback(null, true);
            }
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
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    await app.listen(port);
    logger.info(`Application is running on: http://localhost:${port}`);
    logger.info(`Swagger documentation available at: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map