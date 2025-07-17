import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt, IsBoolean } from 'class-validator';

export class BuyCardResponseDto extends BaseSocketDto {
    override eventName = 'BuyCardResponse';

    @IsString()
    cardId: string;

    @IsString()
    cardType: string;

    @IsInt()
    price: number;

    @IsString()
    cardName: string;

    @IsString()
    cardDescription: string;

    @IsInt()
    cardSprite: number;

    constructor(init?: Partial<BuyCardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
