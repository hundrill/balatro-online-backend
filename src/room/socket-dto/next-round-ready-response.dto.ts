import { BaseSocketDto } from "./base-socket.dto";

export class NextRoundReadyResponseDto extends BaseSocketDto {
    override responseEventName = 'NextRoundReadyResponse';
    userId: string;
    isGiveUp?: boolean;
    isGameEnd?: boolean;
    refundChips?: number;
    finalChips?: number;
    tableChips?: number;
    constructor(init?: Partial<NextRoundReadyResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
