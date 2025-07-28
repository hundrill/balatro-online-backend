import { BaseSocketDto } from "./base-socket.dto";

export class BettingResponseDto extends BaseSocketDto {
    override readonly responseEventName = 'BettingResponse';
    userId: string;
    currentSilverSeed: number;
    currentGoldSeed: number;

    constructor(init?: Partial<BettingResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
