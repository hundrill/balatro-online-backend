import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis/redis.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly redisService: RedisService) { }

  async onModuleInit() {
    const client = this.redisService.getClient();
    await client.set('test', 'hello');
    const value = await client.get('test');
    console.log('Redis test value:', value); // hello
  }

  getHello(): string {
    return 'Hello World!';
  }
}
