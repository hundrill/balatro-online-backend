import { OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
export declare class RedisService implements OnModuleDestroy {
    private readonly client;
    constructor();
    getClient(): Redis;
    onModuleDestroy(): Promise<void>;
}
