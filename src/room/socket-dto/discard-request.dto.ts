import { BaseSocketDto } from './base-socket.dto';
import { ValidateNested, IsArray } from 'class-validator';
import { Card } from '../deck.util';
export class DiscardRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'DiscardRequest';

    @IsArray()
    @ValidateNested({ each: true })
    cards: Card[];
}
