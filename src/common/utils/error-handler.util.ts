import { Logger } from '@nestjs/common';

export class ErrorHandlerUtil {
    private static readonly logger = new Logger(ErrorHandlerUtil.name);

    static handleError(error: any, context: string, operation: string): never {
        const errorMessage = `Error in ${context} - ${operation}: ${error.message}`;
        const errorStack = error.stack || 'No stack trace available';

        this.logger.error(errorMessage, errorStack);

        // 에러 타입에 따른 처리
        if (error.name === 'ValidationError') {
            throw new Error(`Validation failed: ${error.message}`);
        }

        if (error.name === 'ConnectionError') {
            throw new Error(`Database connection failed: ${error.message}`);
        }

        if (error.name === 'RedisError') {
            throw new Error(`Redis operation failed: ${error.message}`);
        }

        // 기본 에러
        throw new Error(`Operation failed: ${error.message}`);
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

    static isOperationalError(error: any): boolean {
        // 재시도 가능한 에러인지 판단
        const operationalErrors = [
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
        ];

        return operationalErrors.includes(error.code);
    }

    static async retryOperation<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000,
        context: string = 'Unknown',
    ): Promise<T> {
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (!this.isOperationalError(error) || attempt === maxRetries) {
                    this.handleError(error, context, `Retry attempt ${attempt}`);
                }

                this.logWarning(
                    `Retry attempt ${attempt}/${maxRetries} failed in ${context}: ${error.message}`,
                );

                if (attempt < maxRetries) {
                    await this.delay(delay * attempt); // 지수 백오프
                }
            }
        }

        throw lastError;
    }

    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 