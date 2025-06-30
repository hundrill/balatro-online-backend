import { Logger } from '@nestjs/common';

export class ErrorHandlerUtil {
  private static readonly logger = new Logger(ErrorHandlerUtil.name);

  static handleError(
    error: unknown,
    context: string,
    operation: string,
  ): never {
    let errorMessage = `Error in ${context} - ${operation}: `;
    let errorStack = 'No stack trace available';
    let errorName = '';
    let errorMsg = '';
    if (error instanceof Error) {
      errorMessage += error.message;
      errorStack = error.stack || errorStack;
      errorName = error.name;
      errorMsg = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      if (typeof errObj.message === 'string') {
        errorMessage += errObj.message;
        errorMsg = errObj.message;
      } else {
        errorMessage += JSON.stringify(errObj);
        errorMsg = JSON.stringify(errObj);
      }
      if (typeof errObj.stack === 'string') {
        errorStack = errObj.stack;
      }
      if (typeof errObj.name === 'string') {
        errorName = errObj.name;
      }
    } else {
      errorMessage += String(error);
      errorMsg = String(error);
    }
    this.logger.error(errorMessage, errorStack);

    // 에러 타입에 따른 처리
    if (errorName === 'ValidationError') {
      throw new Error(`Validation failed: ${errorMsg}`);
    }
    if (errorName === 'ConnectionError') {
      throw new Error(`Database connection failed: ${errorMsg}`);
    }
    if (errorName === 'RedisError') {
      throw new Error(`Redis operation failed: ${errorMsg}`);
    }
    // 기본 에러
    throw new Error(`Operation failed: ${errorMsg}`);
  }

  static logWarning(message: string, context?: string): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    this.logger.warn(logMessage);
  }

  static logInfo(message: string, context?: string): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    this.logger.log(logMessage);
  }

  static logDebug(message: string, context?: string): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    this.logger.debug(logMessage);
  }

  static isOperationalError(error: unknown): boolean {
    // 재시도 가능한 에러인지 판단
    const operationalErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
    ];

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const errObj = error as Record<string, unknown>;
      if (typeof errObj.code === 'string') {
        return operationalErrors.includes(errObj.code);
      }
    }
    return false;
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context: string = 'Unknown',
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;

        if (!this.isOperationalError(error) || attempt === maxRetries) {
          this.handleError(error, context, `Retry attempt ${attempt}`);
        }

        const errorMsg = this.getErrorMessage(error);
        this.logWarning(
          `Retry attempt ${attempt}/${maxRetries} failed in ${context}: ${errorMsg}`,
        );

        if (attempt < maxRetries) {
          await this.delay(delay * attempt); // 지수 백오프
        }
      }
    }

    throw lastError;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as Record<string, unknown>).message === 'string'
    ) {
      return (error as Record<string, unknown>).message as string;
    }
    return String(error);
  }
}
