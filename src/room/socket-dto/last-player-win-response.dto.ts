import { BaseSocketDto } from './base-socket.dto';

export class LastPlayerWinResponseDto extends BaseSocketDto {
    override responseEventName = 'LastPlayerWinResponse';

    lastWinnerId: string;
    chipsGain: number;
    originalChipsGain: number;
    finalChips: number;

    constructor(init?: Partial<LastPlayerWinResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 