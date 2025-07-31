import { BaseSocketDto } from './base-socket.dto';
import { IsString, IsArray, IsOptional } from 'class-validator';
import { Card } from '../deck.util';

export class UseSpecialCardResponseDto extends BaseSocketDto {
    override responseEventName = 'UseSpecialCardResponse';

    @IsString()
    userId: string;

    @IsString()
    cardId: string;

    @IsArray()
    selectedCards: Card[]; // 선택된 카드 리스트

    @IsArray()
    resultCards: Card[]; // 처리 결과 카드 리스트

    constructor(init?: Partial<UseSpecialCardResponseDto>) {
        super();
        Object.assign(this, init);
    }
} 