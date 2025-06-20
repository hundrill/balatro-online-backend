import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly client: Redis;

    constructor() {
        this.client = new Redis(); // 기본 localhost:6379
    }

    getClient() {
        return this.client;
    }

    async onModuleDestroy() {
        await this.client.quit();
    }
} 