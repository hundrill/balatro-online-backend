import { BaseSocketDto } from './base-socket.dto';

export class FoldRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'FoldRequest';
} 