export class StressTestRequestDto {
    static readonly requestEventName = 'StressTestRequest';

    messageCount: number;    // 메시지 개수
    delayMs: number;         // 지연 시간 (ms)
    payload: string;         // 테스트 페이로드
    complexity: number;      // 연산 복잡도 (소수 찾기 범위)
} 