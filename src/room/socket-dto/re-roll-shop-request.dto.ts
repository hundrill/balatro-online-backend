import { BaseSocketDto } from './base-socket.dto';

export class ReRollShopRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'ReRollShopRequest';
}
