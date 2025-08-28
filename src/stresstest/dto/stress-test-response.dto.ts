import { BaseSocketDto } from "src/room/socket-dto/base-socket.dto";

export class StressTestResponseDto extends BaseSocketDto {
    override responseEventName = 'StressTestResponse';

    messageId: number;       // 몇 번째 메시지인지
    echo: string;           // 받은 페이로드 그대로 반환
    processingTime: number; // 처리 시간 (ms)
    primesFound: number;    // 찾은 소수 개수

    constructor(init?: Partial<StressTestResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 