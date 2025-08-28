import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StressTestService {
    private readonly logger = new Logger(StressTestService.name);

    /**
     * CPU 집약적 연산: 소수 찾기
     */
    findPrimes(max: number): number[] {
        const startTime = Date.now();
        const primes: number[] = [];

        for (let num = 2; num <= max; num++) {
            if (this.isPrime(num)) {
                primes.push(num);
            }
        }

        const processingTime = Date.now() - startTime;
        this.logger.log(`[StressTest] 소수 찾기 완료: 1~${max} 범위에서 ${primes.length}개 찾음 (${processingTime}ms)`);

        return primes;
    }

    /**
     * 소수 판별 함수
     */
    private isPrime(num: number): boolean {
        if (num < 2) return false;
        if (num === 2) return true;
        if (num % 2 === 0) return false;

        const sqrt = Math.sqrt(num);
        for (let i = 3; i <= sqrt; i += 2) {
            if (num % i === 0) return false;
        }
        return true;
    }

    /**
     * 메모리 집약적 연산: 대용량 배열 처리
     */
    processLargeArray(size: number): number[] {
        const startTime = Date.now();
        const array: number[] = [];

        // 대용량 배열 생성 및 처리
        for (let i = 0; i < size; i++) {
            array.push(Math.random() * 1000);
        }

        // 배열 정렬 (메모리 집약적 연산)
        array.sort((a, b) => a - b);

        const processingTime = Date.now() - startTime;
        this.logger.log(`[StressTest] 대용량 배열 처리 완료: ${size}개 요소 정렬 (${processingTime}ms)`);

        return array;
    }

    /**
     * 지연 시뮬레이션
     */
    async simulateDelay(ms: number): Promise<void> {
        if (ms > 0) {
            await new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    /**
     * 스트레스 테스트 실행
     */
    async runStressTest(messageId: number, payload: string, complexity: number): Promise<{
        success: boolean;
        processingTime: number;
        primesFound: number;
    }> {
        const startTime = Date.now();

        try {
            // 1. CPU 집약적 연산
            const primes = this.findPrimes(complexity);

            // 2. 메모리 집약적 연산 (페이로드 크기에 비례)
            const arraySize = Math.min(10000, payload.length * 10);
            this.processLargeArray(arraySize);

            // 3. 지연 시뮬레이션 (복잡도에 비례)
            const delayMs = Math.min(100, Math.floor(complexity / 100));
            await this.simulateDelay(delayMs);

            const processingTime = Date.now() - startTime;

            this.logger.log(`[StressTest] 메시지 ${messageId} 처리 완료 (${processingTime}ms)`);

            return {
                success: true,
                processingTime,
                primesFound: primes.length
            };
        } catch (error) {
            this.logger.error(`[StressTest] 메시지 ${messageId} 처리 실패:`, error);
            return {
                success: false,
                processingTime: Date.now() - startTime,
                primesFound: 0
            };
        }
    }
} 