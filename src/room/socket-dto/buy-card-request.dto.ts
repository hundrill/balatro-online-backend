import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt } from 'class-validator';

export class BuyCardRequestDto extends BaseSocketDto {
    @IsString()
    roomId: string;

    @IsString()
    cardId: string;

    @IsString()
    cardType: string;

    @IsInt()
    price: number;
}
