import { BaseSocketDto } from './base-socket.dto';
import { BettingType } from '../betting-type.enum';

export class BettingRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'BettingRequest';

    bettingType: BettingType;

    constructor(init?: Partial<BettingRequestDto>) {
        super();
        Object.assign(this, init);
    }
}
