import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting Balatro Online Backend...');

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // CORS 설정
    app.enableCors({
      origin: true,
      credentials: true,
    });

    const port = process.env.NEST_PORT || 3000;
    await app.listen(port);

    logger.log(`Balatro Online Backend is running on port ${port}`);
    logger.log('Environment: ' + (process.env.NODE_ENV || 'development'));

    // Graceful shutdown 설정
    const signals = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.log(`Received ${signal}, starting graceful shutdown...`);
        try {
          await app.close();
          logger.log('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    }

  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Failed to start Balatro Online Backend', error.stack);
    } else {
      logger.error('Failed to start Balatro Online Backend', String(error));
    }
    process.exit(1);
  }
}

void bootstrap();
