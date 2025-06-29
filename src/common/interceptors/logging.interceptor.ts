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
        const { method, url, body, query, params } = request;
        const userAgent = request.get('User-Agent') || '';
        const startTime = Date.now();

        // 요청 로깅
        this.logger.log(
            `Incoming Request: ${method} ${url} - User-Agent: ${userAgent}`,
        );
        if (Object.keys(body).length > 0) {
            this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
        }
        if (Object.keys(query).length > 0) {
            this.logger.debug(`Request Query: ${JSON.stringify(query)}`);
        }
        if (Object.keys(params).length > 0) {
            this.logger.debug(`Request Params: ${JSON.stringify(params)}`);
        }

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    this.logger.log(
                        `Outgoing Response: ${method} ${url} - ${response.statusCode} - ${duration}ms`,
                    );
                    this.logger.debug(`Response Data: ${JSON.stringify(data)}`);
                },
                error: (error) => {
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    this.logger.error(
                        `Request Error: ${method} ${url} - ${duration}ms - ${error.message}`,
                        error.stack,
                    );
                },
            }),
        );
    }
} 