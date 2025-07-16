import { BaseSocketDto } from './base-socket.dto';

export class HandPlayReadyResponse extends BaseSocketDto {
    override eventName = 'handPlayReady';
    userId: string;
    constructor(init?: Partial<HandPlayReadyResponse>) {
        super();
        Object.assign(this, init);
    }
}
