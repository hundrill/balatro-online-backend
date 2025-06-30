import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '';

    this.logger.log(
      `Incoming ${method} ${originalUrl} from ${ip} - User-Agent: ${userAgent}`,
    );

    // 응답 완료 후 로깅
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      this.logger.log(
        `Outgoing ${method} ${originalUrl} - ${statusCode} - ${duration}ms`,
      );
    });

    next();
  }
}
