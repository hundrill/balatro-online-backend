import { BaseSocketDto } from './base-socket.dto';
import { IsString, ValidateNested, IsArray, IsInt } from 'class-validator';
import { Card } from '../deck.util';
export class HandPlayReadyRequestDto extends BaseSocketDto {
    static readonly requestEventName = 'HandPlayReadyRequest';

    @IsArray()
    @ValidateNested({ each: true })
    playCards: Card[];
}
