import { BaseSocketDto } from './base-socket.dto';
import { IsInt, IsArray, IsString, IsOptional } from 'class-validator';
import { CardData } from '../deck.util';

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
    newHand?: CardData[];

    @IsOptional()
    @IsArray()
    discarded?: CardData[];

    @IsInt()
    remainingDiscards: number;

    constructor(init?: Partial<DiscardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
