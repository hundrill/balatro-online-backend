import { BaseSocketDto } from './base-socket.dto';
import { BettingType } from '../betting-type.enum';

export class BettingResultDto extends BaseSocketDto {
    override responseEventName = 'BettingResult';

    userId: string;
    bettingType: BettingType;
    bettingAmount: number;
    tableChips: number;
    callChips: number;
    isBettingComplete: boolean; // 모든 베팅이 완료됐는지 여부
    currentBettingRound: number; // 현재 몇 번째 베팅라운드인지

    constructor(init?: Partial<BettingResultDto>) {
        super();
        Object.assign(this, init);
    }
} 