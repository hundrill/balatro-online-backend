import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt } from 'class-validator';

export class SellCardRequestDto extends BaseSocketDto {
    static readonly eventNameRequest = 'SellCardRequest';

    @IsString()
    cardId: string;
}
