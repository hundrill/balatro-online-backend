import { BaseSocketDto } from './base-socket.dto';

export class FoldResponseDto extends BaseSocketDto {
    override responseEventName = 'FoldResponse';
    userId: string;                // fold한 유저 ID
    isGameRestarting: boolean;     // 새 게임 시작 여부
    lastWinnerId?: string;         // 마지막 승자 ID (있는 경우)
    chipsReward?: number;          // 지급된 칩
    finalChips?: number;           // 마지막 승자의 최종 칩
    finalFunds?: number;           // 마지막 승자의 최종 자금

    constructor(init?: Partial<FoldResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 