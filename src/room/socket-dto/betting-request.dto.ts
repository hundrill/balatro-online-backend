import { BaseSocketDto } from './base-socket.dto';

export class BettingRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'BettingRequest';
}
