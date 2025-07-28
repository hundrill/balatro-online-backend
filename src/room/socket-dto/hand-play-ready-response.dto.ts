import { BaseSocketDto } from './base-socket.dto';

export class HandPlayReadyResponseDto extends BaseSocketDto {
    override responseEventName = 'HandPlayReadyResponse';
    userId: string;
    constructor(init?: Partial<HandPlayReadyResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
