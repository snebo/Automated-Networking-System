import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    let retries = 3;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully');
        break;
      } catch (error) {
        this.logger.error(`Database connection failed (${retries} retries left): ${error.message}`);
        retries--;
        if (retries === 0) {
          this.logger.error('Failed to connect to database after 3 attempts');
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => {
        const keyStr = String(key);
        return keyStr[0] !== '_' && keyStr[0] !== '$' && keyStr !== 'constructor';
      },
    );

    return Promise.all(
      models.map((modelKey) => {
        return (this as any)[modelKey].deleteMany();
      }),
    );
  }
}