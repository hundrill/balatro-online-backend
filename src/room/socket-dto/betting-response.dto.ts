import { BaseSocketDto } from './base-socket.dto';

export class BettingResponseDto extends BaseSocketDto {
    override responseEventName = 'BettingResponse';

    currentUserId: string;
    tableChips: number;
    callChips: number;
    canRaise: boolean;
    canCheck: boolean;
    canCall: boolean;
    quarterAmount: number;
    halfAmount: number;
    fullAmount: number;
    callAmount: number;

    constructor(init?: Partial<BettingResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
