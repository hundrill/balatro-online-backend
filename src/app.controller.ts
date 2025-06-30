import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    try {
      this.logger.log('Health check requested');

      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: (() => {
          try {
            return process.memoryUsage();
          } catch {
            return 'unavailable';
          }
        })(),
      };

      this.logger.log(`Health check completed: ${healthStatus.status}`);
      return healthStatus;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Health check failed', error.stack);
        return {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message,
        };
      } else {
        this.logger.error('Health check failed', String(error));
        return {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Unknown error',
        };
      }
    }
  }
}
