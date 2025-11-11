import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    const redisOptions: any = {
      host: process.env.REDIS_URL || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: false,
    };

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

  // 중복 접속 관련 메서드들
  async addChannelMember(userId: string): Promise<boolean> {
    try {
      const key = `channel_member:${userId}`;
      const value = JSON.stringify({
        userId,
        connectedAt: new Date().toISOString(),
      });

      // 기존 연결이 있는지 확인
      const existing = await this.client.get(key);
      if (existing) {
        this.logger.warn(`Duplicate connection detected for user: ${userId}`);
        return false; // 중복 접속
      }

      // 새 연결 정보 저장 (TTL: 1시간)
      await this.client.setex(key, 3600, value);
      this.logger.log(`User ${userId} connected`);
      return true; // 새 접속
    } catch (error) {
      this.logger.error(`Error adding channel member: ${error}`);
      return false;
    }
  }

  async removeChannelMember(userId: string): Promise<void> {
    try {
      const key = `channel_member:${userId}`;
      await this.client.del(key);
      this.logger.log(`User ${userId} disconnected`);
    } catch (error) {
      this.logger.error(`Error removing channel member: ${error}`);
    }
  }

  async isUserConnected(userId: string): Promise<boolean> {
    try {
      const key = `channel_member:${userId}`;
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking user connection: ${error}`);
      return false;
    }
  }

  async getUserConnectionInfo(userId: string): Promise<any> {
    try {
      const key = `channel_member:${userId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get user connection info for ${userId}`, error.stack);
      } else {
        this.logger.error(`Failed to get user connection info for ${userId}`, String(error));
      }
      return null;
    }
  }

  async getOnlineUsers(): Promise<string[]> {
    try {
      const keys = await this.client.keys('channel_member:*');
      const onlineUsers: string[] = [];

      for (const key of keys) {
        const userId = key.replace('channel_member:', '');
        onlineUsers.push(userId);
      }

      return onlineUsers;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Failed to get online users', error.stack);
      } else {
        this.logger.error('Failed to get online users', String(error));
      }
      return [];
    }
  }
}
