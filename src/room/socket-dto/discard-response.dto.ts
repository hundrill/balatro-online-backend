import { BaseSocketDto } from './base-socket.dto';
import { IsInt, IsArray, IsString, IsOptional } from 'class-validator';
import { Card } from '../deck.util';

export class DiscardResponseDto extends BaseSocketDto {
    override responseEventName = 'DiscardResponse';

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsInt()
    discardCount?: number;

    @IsOptional()
    @IsArray()
    newHand?: Card[];

    @IsOptional()
    @IsArray()
    discarded?: Card[];

    @IsInt()
    remainingDiscards: number;

    constructor(init?: Partial<DiscardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
