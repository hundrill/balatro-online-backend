import { BaseSocketDto } from './base-socket.dto';

export class HandPlayResultResponseDto extends BaseSocketDto {
    override eventName = 'handPlayResult';

    roundResult: any;
    shopCards: any;
    ownedCards: any;
    round: any;

    constructor(init?: Partial<HandPlayResultResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
