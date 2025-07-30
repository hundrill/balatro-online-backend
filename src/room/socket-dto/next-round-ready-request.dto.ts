import { BaseSocketDto } from './base-socket.dto';

export class NextRoundReadyRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'NextRoundReadyRequest';
}
