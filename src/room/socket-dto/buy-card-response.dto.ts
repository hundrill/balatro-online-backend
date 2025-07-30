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

    @IsOptional()
    @IsArray()
    planetCardIds?: string[]; // tarot_10용 행성 카드 ID 리스트

    constructor(init?: Partial<BuyCardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
