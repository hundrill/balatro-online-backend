import { Injectable, CanActivate, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthCheckGuard implements CanActivate {
  private readonly logger = new Logger(HealthCheckGuard.name);

  constructor(private readonly redisService: RedisService) {}

  canActivate(): boolean | Promise<boolean> | Observable<boolean> {
    return this.checkHealth();
  }

  private async checkHealth(): Promise<boolean> {
    try {
      // Redis 연결 상태 확인
      const isRedisConnected = await this.redisService.isConnected();

      if (!isRedisConnected) {
        this.logger.error('Health check failed: Redis not connected');
        return false;
      }

      this.logger.debug('Health check passed: All services are healthy');
      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Health check failed with error', error.stack);
      } else {
        this.logger.error('Health check failed with error', String(error));
      }
      return false;
    }
  }
}
