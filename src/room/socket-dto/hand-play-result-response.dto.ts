import { BaseSocketDto } from './base-socket.dto';

export class HandPlayResultResponseDto extends BaseSocketDto {
    override responseEventName = 'HandPlayResultResponse';

    roundResult: any;
    shopCards: any;
    round: any;

    constructor(init?: Partial<HandPlayResultResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
