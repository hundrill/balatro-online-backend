import { BaseSocketDto } from './base-socket.dto';
import { IsString, ValidateNested, IsArray } from 'class-validator';
import { Card } from '../deck.util';

export class UseSpecialCardRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'UseSpecialCardRequest';

    @IsString()
    cardId: string;

    @IsArray()
    @ValidateNested({ each: true })
    cards: Card[];
}
