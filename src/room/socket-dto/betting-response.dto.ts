import { BaseSocketDto } from "./base-socket.dto";

export class BettingResponseDto extends BaseSocketDto {
    override readonly responseEventName = 'BettingResponse';
    userId: string;
    currentBettingAmount: number;  // 현재 베팅 머니

    constructor(init?: Partial<BettingResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
