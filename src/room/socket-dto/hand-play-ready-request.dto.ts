import { BaseSocketDto } from './base-socket.dto';
import { IsString, ValidateNested, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class HandPlayReadyRequestDto extends BaseSocketDto {
    @IsString()
    roomId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CardDto)
    hand: CardDto[];
}

export class CardDto {
    @IsString()
    suit: string;

    @IsInt()
    rank: number;
}
