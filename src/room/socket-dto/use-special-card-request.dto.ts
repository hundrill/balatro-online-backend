import { BaseSocketDto } from './base-socket.dto';
import { IsString, ValidateNested, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UseSpecialCardRequestDto extends BaseSocketDto {
    static readonly eventNameRequest = 'UseSpecialCardRequest';

    @IsString()
    cardId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CardDto)
    cards: CardDto[];
}

export class CardDto {
    @IsString()
    suit: string;

    @IsInt()
    rank: number;
} 