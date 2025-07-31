import { BaseSocketDto } from './base-socket.dto';
import { IsInt, IsArray } from 'class-validator';
import { Card } from '../deck.util';

export class DiscardResponseDto extends BaseSocketDto {
    override responseEventName = 'DiscardResponse';

    @IsArray()
    newHand: Card[];

    @IsArray()
    discarded: Card[];

    @IsInt()
    remainingDiscards: number;

    constructor(init?: Partial<DiscardResponseDto>) {
        super();
        Object.assign(this, init);
    }
}
