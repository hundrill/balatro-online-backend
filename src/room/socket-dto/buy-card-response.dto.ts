import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsInt, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class BuyCardResponseDto extends BaseSocketDto {
    override responseEventName = 'BuyCardResponse';

    @IsString()
    userId: string;

    @IsString()
    cardId: string;

    @IsInt()
    funds: number;

    @IsOptional()
    @IsArray()
    firstDeckCards?: any[]; // 수정된 덱의 앞 8장

    constructor(init?: Partial<BuyCardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
