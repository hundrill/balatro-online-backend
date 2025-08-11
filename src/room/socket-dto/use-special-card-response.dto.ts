import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsArray, IsOptional } from 'class-validator';
import { CardData } from '../deck.util';

export class UseSpecialCardResponseDto extends BaseSocketDto {
    override responseEventName = 'UseSpecialCardResponse';

    @IsString()
    userId: string;

    @IsString()
    cardId: string;

    @IsArray()
    selectedCards: CardData[]; // 선택된 카드 리스트

    @IsArray()
    resultCards: CardData[]; // 처리 결과 카드 리스트

    constructor(init?: Partial<UseSpecialCardResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 