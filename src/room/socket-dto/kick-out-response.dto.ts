import { BaseSocketDto } from './base-socket.dto';

export class KickOutResponseDto extends BaseSocketDto {
    override responseEventName = 'KickOutResponse';
    kickOutUserId: string;
    isReserved: boolean;

    constructor(init?: Partial<KickOutResponseDto>) {
        super();
        Object.assign(this, init);
    }
}