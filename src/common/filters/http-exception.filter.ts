import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object = 'Internal server error';
    let errorMsg = 'Unknown error';
    let stack = 'Unknown error';
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }
    if (exception instanceof Error) {
      errorMsg = exception.message;
      stack = exception.stack || stack;
    }
    let responseMessage: string;
    if (typeof message === 'string') {
      responseMessage = message;
    } else if (
      typeof message === 'object' &&
      message !== null &&
      'message' in message &&
      typeof (message as Record<string, unknown>).message === 'string'
    ) {
      responseMessage = (message as Record<string, unknown>).message as string;
    } else {
      responseMessage = JSON.stringify(message);
    }
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: responseMessage,
      error: errorMsg,
    };
    // 에러 로그
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${errorResponse.message}`,
      stack,
    );
    response.status(status).json(errorResponse);
  }
}
