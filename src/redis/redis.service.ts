import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    const redisOptions: {
      host: string;
      port: number;
      maxRetriesPerRequest: number;
      password?: string;
    } = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
    };

    if (process.env.REDIS_PASSWORD) {
      redisOptions.password = process.env.REDIS_PASSWORD;
    }

    this.client = new Redis(redisOptions);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.client.on('error', (error: unknown) => {
      if (error instanceof Error) {
        this.logger.error('Redis client error', error.stack);
      } else {
        this.logger.error('Redis client error', String(error));
      }
    });

    this.client.on('close', () => {
      this.logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting...');
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Redis connection check failed', error.stack);
      } else {
        this.logger.error('Redis connection check failed', String(error));
      }
      return false;
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Disconnecting Redis client...');
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error disconnecting Redis client', error.stack);
      } else {
        this.logger.error('Error disconnecting Redis client', String(error));
      }
    }
  }
}
