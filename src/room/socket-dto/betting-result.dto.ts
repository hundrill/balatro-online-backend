import { BaseSocketDto } from './base-socket.dto';
import { BettingType } from '../betting-type.enum';

export class BettingResultDto extends BaseSocketDto {
    override responseEventName = 'BettingResult';

    userId: string;
    bettingType: BettingType;
    bettingAmount: number;
    tableChips: number;
    callChips: number;

    constructor(init?: Partial<BettingResultDto>) {
        super();
        Object.assign(this, init);
    }
} 