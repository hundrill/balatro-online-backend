import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt, IsBoolean } from 'class-validator';

export class BuyCardResultDto extends BaseSocketDto {
    override eventName = 'buyCardResult';

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

    constructor(init?: Partial<BuyCardResultDto>) {
        super();
        Object.assign(this, init);
    }
}
