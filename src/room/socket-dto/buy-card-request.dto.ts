import { BaseSocketDto } from './base-socket.dto';
import { IsString } from 'class-validator';

export class BuyCardRequestDto extends BaseSocketDto {
    static readonly eventNameRequest = 'BuyCardRequest';

    @IsString()
    cardId: string;
}
