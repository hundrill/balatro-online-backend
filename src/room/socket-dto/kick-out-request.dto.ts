import { BaseSocketDto } from './base-socket.dto';

export class KickOutRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'KickOutRequest';

    userId: string; // 추방할 유저의 ID

    constructor(init?: Partial<KickOutRequestDto>) {
        super();
        Object.assign(this, init);
    }
}