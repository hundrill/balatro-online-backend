export class StressTestResponseDto {
    static readonly responseEventName = 'StressTestResponse';

    success: boolean;
    messageId: number;       // 몇 번째 메시지인지
    echo: string;           // 받은 페이로드 그대로 반환
    processingTime: number; // 처리 시간 (ms)
    primesFound: number;    // 찾은 소수 개수
} 