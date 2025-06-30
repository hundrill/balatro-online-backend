import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method: string = request.method;
    const url: string = request.url;
    const body: unknown = request.body;
    const query: unknown = request.query;
    const params: unknown = request.params;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    // 요청 로깅
    this.logger.log(
      `Incoming Request: ${method} ${url} - User-Agent: ${userAgent}`,
    );
    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }
    if (query && typeof query === 'object' && Object.keys(query).length > 0) {
      this.logger.debug(`Request Query: ${JSON.stringify(query)}`);
    }
    if (
      params &&
      typeof params === 'object' &&
      Object.keys(params).length > 0
    ) {
      this.logger.debug(`Request Params: ${JSON.stringify(params)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${response.statusCode} - ${duration}ms`,
          );
          let responseData: string;
          try {
            responseData = JSON.stringify(data);
          } catch {
            responseData = '[Unserializable Response]';
          }
          this.logger.debug(`Response Data: ${responseData}`);
        },
        error: (error: unknown) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          let errorMsg = '';
          let stack = undefined;
          if (error instanceof Error) {
            errorMsg = error.message;
            stack = error.stack;
          } else if (
            typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof (error as Record<string, unknown>).message === 'string'
          ) {
            errorMsg = (error as Record<string, unknown>).message as string;
          } else {
            errorMsg = String(error);
          }
          this.logger.error(
            `Request Error: ${method} ${url} - ${duration}ms - ${errorMsg}`,
            stack,
          );
        },
      }),
    );
  }
}
