import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt } from 'class-validator';

export class SellCardRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'SellCardRequest';

    @IsString()
    cardId: string;
}
