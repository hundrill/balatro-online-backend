import { BaseSocketDto } from './base-socket.dto';

export class LastPlayerWinResponseDto extends BaseSocketDto {
    override responseEventName = 'LastPlayerWinResponse';

    lastWinnerId: string;
    chipsGain: number;
    originalChipsGain: number;
    finalChips: number;
    round: number; // 현재 라운드
    byFold: boolean; // 베팅 중에 모든 유저가 fold해서 종료된 건지 여부

    constructor(init?: Partial<LastPlayerWinResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 